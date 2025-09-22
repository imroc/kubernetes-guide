# 云厂商集成 cilium 调研

## 火山引擎 VKE

基于 VKE v1.30 调研：
- vpc-cni 网络模式：CNI 组件（cello）中，包含 cilium 容器，使得每个节点都会启动一个 `cilium-agent` 和 `cilium-operator`，使用 cilium 来替代 kube-proxy，实现集群内的 Service 转发。
