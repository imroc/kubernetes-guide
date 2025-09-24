# 在 ACK 上安装 cilium

## 前提条件
- 网络插件：terway

## 安装 cilium

参考 [Installation using Helm](https://docs.cilium.io/en/stable/installation/k8s-install-helm/)。

1. 删除预装的 terway 和 crd:
```bash
kubectl -n kube-system delete daemonset terway-eniip
kubectl delete crd \
    ciliumclusterwidenetworkpolicies.cilium.io \
    ciliumendpoints.cilium.io \
    ciliumidentities.cilium.io \
    ciliumnetworkpolicies.cilium.io \
    ciliumnodes.cilium.io \
    bgpconfigurations.crd.projectcalico.org \
    clusterinformations.crd.projectcalico.org \
    felixconfigurations.crd.projectcalico.org \
    globalnetworkpolicies.crd.projectcalico.org \
    globalnetworksets.crd.projectcalico.org \
    hostendpoints.crd.projectcalico.org \
    ippools.crd.projectcalico.org \
    networkpolicies.crd.projectcalico.org
```

2. 创建 `cilium-secret.yaml` 文件，填入 aksk：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-alibabacloud
  namespace: kube-system
type: Opaque
stringData:
  ALIBABA_CLOUD_ACCESS_KEY_ID: ""
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: ""
```

3. 安装：

```bash
kubectl apply -f cilium-secret.yaml
helm install cilium cilium/cilium --version 1.18.2 \
  --namespace kube-system \
  --set alibabacloud.enabled=true \
  --set ipam.mode=alibabacloud \
  --set enableIPv4Masquerade=false \
  --set routingMode=native
```

4. 修改 DaemonSet。实测需修改 cilium daemonset，给这几个 container 加上特权才能正常启动(`apply-sysctl-overwrites`, `mount-cgroup`, `install-cni-binaries`)，否则会报权限问题的错误：
  ```bash
  $ kubectl logs -f cilium-hkphf -c mount-cgroup
  cp: cannot stat '/hostbin/cilium-mount': Permission denied

  $ kubectl logs -f cilium-hkphf -c apply-sysctl-overwrites
  Installing loopback to /host/opt/cni/bin/loopback ...
  cp: cannot stat '/host/opt/cni/bin/.loopback.new': Permission denied
  Installing cilium-cni to /host/opt/cni/bin/cilium-cni ...
  cp: cannot stat '/host/opt/cni/bin/.cilium-cni.new': Permission denied
  ```

5. 删除自带的 `cilium-operator-resource-lock` (terway 控制面自带 cilium operator)，否则 cilium-operator 无法成功选主并运行 cilium 控制面逻辑:
  ```bash
  kubectl delete leases.coordination.k8s.io cilium-operator-resource-lock
  ```
