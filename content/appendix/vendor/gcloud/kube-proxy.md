# GKE 的 kube-proxy

## 组件 YAML

<FileBlock file="vendor/gcloud/kube-proxy.yaml" showLineNumbers />

## 转发模式

从 YAML 中可以看出，没有设置 mode，也没有挂载 config，所以为 kube-proxy 的默认 mode，为 “iptables” 模式。
