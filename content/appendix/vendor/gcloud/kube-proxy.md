# GKE 的 kube-proxy

## 组件 YAML

以 DaemonSet 方式部署了一个 kube-proxy:

<FileBlock file="vendor/gcloud/kube-proxy.yaml" showLineNumbers />

但有 nodeSelector，默认不会部署到节点，不过节点上还是会有 kube-proxy 的 Pod 启动，只是不是来自这个 DeamonSet，而是通过 static pod 方式部署：

<FileBlock file="vendor/gcloud/kube-proxy-pod.yaml" showLineNumbers title="/etc/kubernetes/manifests/kube-proxy.manifest" />

## 转发模式

从 YAML 中可以看出，没有设置 mode，也没有挂载 config，所以为 kube-proxy 的默认 mode，为 `iptables` 模式。

## 节点 iptables 版本

```bash
$ iptables --version
iptables v1.8.10 (nf_tables)
```
