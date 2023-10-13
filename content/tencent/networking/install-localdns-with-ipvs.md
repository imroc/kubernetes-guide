# IPVS 模式安装 localdns

## 背景

TKE 对 NodeLocal DNS Cache 进行了产品化支持，直接在扩展组件里面就可以一键安装到集群，参考 [NodeLocalDNSCache 扩展组件说明](https://cloud.tencent.com/document/product/457/49423) ，可是仅仅支持 iptables 转发模式的集群，而目前大多集群都会使用 IPVS 转发模式，无法安装这个扩展组件。

本文将介绍如何在 TKE IPVS 模式集群中自行安装 NodeLocal DNS Cache。


## 准备 yaml

复制以下 yaml 到文件 `nodelocaldns.yaml`:

```yaml
# Copyright 2018 The Kubernetes Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
---
apiVersion: v1
kind: Service
metadata:
  name: kube-dns-upstream
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/name: "KubeDNSUpstream"
spec:
  ports:
  - name: dns
    port: 53
    protocol: UDP
    targetPort: 53
  - name: dns-tcp
    port: 53
    protocol: TCP
    targetPort: 53
  selector:
    k8s-app: kube-dns
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
data:
  Corefile: |
    cluster.local:53 {
        errors
        cache {
                success 9984 30
                denial 9984 5
        }
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
                force_tcp
        }
        prometheus :9253
        health 169.254.20.10:8080
        }
    in-addr.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
                force_tcp
        }
        prometheus :9253
        }
    ip6.arpa:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__CLUSTER__DNS__ {
                force_tcp
        }
        prometheus :9253
        }
    .:53 {
        errors
        cache 30
        reload
        loop
        bind 169.254.20.10
        forward . __PILLAR__UPSTREAM__SERVERS__
        prometheus :9253
        }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-local-dns
  namespace: kube-system
  labels:
    k8s-app: node-local-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 10%
  selector:
    matchLabels:
      k8s-app: node-local-dns
  template:
    metadata:
      labels:
        k8s-app: node-local-dns
      annotations:
        prometheus.io/port: "9253"
        prometheus.io/scrape: "true"
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: node-local-dns
      hostNetwork: true
      dnsPolicy: Default  # Don't use cluster DNS.
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      - effect: "NoExecute"
        operator: "Exists"
      - effect: "NoSchedule"
        operator: "Exists"
      containers:
      - name: node-cache
        image: cr.imroc.cc/k8s/k8s-dns-node-cache:1.17.0
        resources:
          requests:
            cpu: 25m
            memory: 5Mi
        args: [ "-localip", "169.254.20.10", "-conf", "/etc/Corefile", "-upstreamsvc", "kube-dns-upstream" ]
        securityContext:
          privileged: true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9253
          name: metrics
          protocol: TCP
        livenessProbe:
          httpGet:
            host: 169.254.20.10
            path: /health
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 5
        volumeMounts:
        - mountPath: /run/xtables.lock
          name: xtables-lock
          readOnly: false
        - name: config-volume
          mountPath: /etc/coredns
        - name: kube-dns-config
          mountPath: /etc/kube-dns
      volumes:
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: kube-dns-config
        configMap:
          name: kube-dns
          optional: true
      - name: config-volume
        configMap:
          name: node-local-dns
          items:
          - key: Corefile
            path: Corefile.base
---
# A headless service is a service with a service IP but instead of load-balancing it will return the IPs of our associated Pods.
# We use this to expose metrics to Prometheus.
apiVersion: v1
kind: Service
metadata:
  annotations:
    prometheus.io/port: "9253"
    prometheus.io/scrape: "true"
  labels:
    k8s-app: node-local-dns
  name: node-local-dns
  namespace: kube-system
spec:
  clusterIP: None
  ports:
  - name: metrics
    port: 9253
    targetPort: 9253
  selector:
    k8s-app: node-local-dns
```

## 替换集群 DNS 地址

获取集群 DNS 的地址并替换 yaml 文件中的 `__PILLAR__CLUSTER__DNS__` 变量:

```bash
kubedns=`kubectl get svc kube-dns -n kube-system -o jsonpath={.spec.clusterIP}`

sed -i "s/__PILLAR__CLUSTER__DNS__/$kubedns/g" nodelocaldns.yaml
```

> `__PILLAR__UPSTREAM__SERVERS__` 这个变量我们不管，localdns pod 会自行填充。


## 一键安装

通过以下命令一键安装到集群:

```bash
kubectl apply -f nodelocaldns.yaml
```

## 修改 kubelet 参数

IPVS 模式集群由于需要为所有 Service 在 `kube-ipvs0` 这个 dummy 网卡上绑对应的 Cluster IP，以实现 IPVS 转发，所以 localdns 就无法再监听集群 DNS 的 Cluster IP。而 kubelet 的 `--cluster-dns` 默认指向的是集群 DNS 的 Cluster IP 而不是 localdns 监听的地址，安装 localdns 之后集群中的 Pod 默认还是使用的集群 DNS 解析。

如何让 Pod 默认使用 localdns 进行 DNS 解析呢？需要改每个节点上 kubelet 的 `--cluster-dns` 启动参数:

```txt
--cluster-dns=169.254.20.10
```

可以通过以下脚本进行修改并重启 kubelet 来生效:

```bash
sed -i 's/CLUSTER_DNS.*/CLUSTER_DNS="--cluster-dns=169.254.20.10"/' /etc/kubernetes/kubelet
systemctl restart kubelet
```

### 存量节点修改

如何修改集群中已有节点的 kubelet 参数呢？目前没有产品化解决方案，可以自行通过第三方工具来修改，通常使用 ansible，安装方式参考 [官方文档: Installing Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) 。

安装好 ansible 之后，按照以下步骤操作:

1. 导出所有节点 IP 到 `hosts.ini`:

```bash
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}' | tr ' ' '\n' > hosts.ini
```

2. 准备脚本 `modify-kubelet.sh`:

```bash
sed -i 's/CLUSTER_DNS.*/CLUSTER_DNS="--cluster-dns=169.254.20.10"/' /etc/kubernetes/kubelet
systemctl restart kubelet
```

3. 准备可以用于节点登录的 ssh 秘钥或密码 (秘钥改名为 key，并执行 `chmod 0600 key`)
4. 使用 ansible 在所有节点上运行脚本 `modify-kubelet.sh`:
    * 使用秘钥的示例:
      ```bash
      ansible all -i hosts.ini --ssh-common-args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --user root --private-key=key -m script -a "mo  dify-kubelet.sh"
      ```
    * 使用密码的示例:
      ```bash
      ansible all -i hosts.ini --ssh-common-args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" -m script --extra-vars "ansible_user=root an  sible_password=yourpassword" -a "modify-kubelet.sh"
      ```
   > **注:** 如果节点使用的 ubuntu 系统，默认 user 是 ubuntu，可以自行替换下，另外 ansible 参数再加上 `--become --become-user=root` 以便让 ansible 执行脚本时拥有 root 权限，避免操作失败。

### 增量节点修改

如何让新增的节点都默认修改 kubelet 参数呢？可以在加节点时设置【自定义数据】(即自定义初始化脚本)，会在节点组件初始化好后执行:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925161511.png)

每个节点都贴一下脚本过于麻烦，一般建议使用节点池，在创建节电池时指定节点的【自定义数据】，这样就可以让节点池里扩容出来的节点都执行下这个脚本，而无需每个节点都单独设置:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925161519.png)

## 关于存量 Pod

集群中正在运行的存量 Pod 还是会使用旧的集群 DNS，等重建后会自动切换到 localdns，新创建的 Pod 也都会默认使用 localdns。

一般没特别需要的情况下，可以不管存量 Pod，等下次更新， Pod 重建后就会自动切换到 localdns；如果想要立即切换，可以将工作负载滚动更新触发 Pod 重建来实现手动切换。

## 参考资料

* [Using NodeLocal DNSCache in Kubernetes clusters](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
