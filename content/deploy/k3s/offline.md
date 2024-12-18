# 离线安装方法

## 步骤

### 下载离线文件

进入 [k3s release](https://github.com/k3s-io/k3s/releases) 页面，下载 k3s 二进制和依赖镜像的压缩包:

* `k3s`: 二进制。
* `k3s-airgap-images-amd64.tar`: 镜像压缩包。

下载安装脚本:

```bash
curl -o install.sh https://get.k3s.io
```

下载完将所有文件放入需要安装 k3s 的机器上。

### 安装依赖镜像

```bash
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp ./k3s-airgap-images-amd64.tar /var/lib/rancher/k3s/agent/images/
```

### 安装 k3s 二进制

```bash
chmod +x k3s
cp k3s /usr/local/bin/
```

### 执行安装脚本

```bash
chmod +x install.sh
INSTALL_K3S_SKIP_DOWNLOAD=true ./install.sh
```

### 验证

查看 k3s 运行状态:

```bash
systemctl status k3s
```

查看 k3s 日志:

```bash
journalctl -u k3s -f
```

查看 k3s 集群状态:

```bash
$ k3s kubectl get node
NAME               STATUS   ROLES                  AGE     VERSION
vm-55-160-centos   Ready    control-plane,master   3m22s   v1.25.2+k3s1
$ k3s kubectl get pod -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-5b5579c644-6h99x   1/1     Running     0          3m22s
kube-system   coredns-75fc8f8fff-sjjzs                  1/1     Running     0          3m22s
kube-system   helm-install-traefik-crd-mgffn            0/1     Completed   0          3m22s
kube-system   metrics-server-74474969b-6bj6r            1/1     Running     0          3m22s
kube-system   svclb-traefik-0ab06643-6vj96              2/2     Running     0          3m1s
kube-system   helm-install-traefik-m7wdm                0/1     Completed   2          3m22s
kube-system   traefik-7d647b7597-dw6b4                  1/1     Running     0          3m1s
```

### 获取 kubeconfig

若希望在本机之外用 kubectl 操作集群，可以将 kubeconfig 导出来:

```bash
k3s kubectl config view --raw > k3s
```

修改其中 server 地址的 IP 为本机 IP，将 kubeconfig 文件放到 kubectl 所在机器上，然后用 [kubecm](https://github.com/sunny0826/kubecm) 合并到本地 kubeconfig:

```bash
kubecm add --context-name=k3s -cf k3s
```

使用 [kubectx](https://github.com/ahmetb/kubectx) 切换 context:

```bash
$ kubectl ctx k3s
Switched to context "k3s".
```

使用 kubectl 操作 k3s 集群:

```bash
$ kubectl get node
NAME               STATUS   ROLES                  AGE   VERSION
vm-55-160-centos   Ready    control-plane,master   14m   v1.25.2+k3s1
```

## 参考资料

* [k3s 离线安装官方文档](https://docs.k3s.io/zh/installation/airgap)

