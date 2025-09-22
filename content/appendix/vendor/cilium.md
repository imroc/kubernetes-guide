# 云厂商集成 cilium 调研

## AWS EKS

基于 EKS v1.33 调研：

EKS 只有一种网络插件，VPC-CNI，没有集成 cilium，但 cilium 社区适配了 EKS 的 VPC-CNI 网络插件([CNI Chaining: AWS VPC CNI plugin](https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/))，使得在 EKS 上安装 cilium 后，Pod IP 分配和转发由 VPC-CNI 实现，cilium 再负责其它能力的实现（如替代 kube-proxy 实现 Service 转发、NetworkPolicy、网络可观测性等）。

## 火山引擎 VKE

基于 VKE v1.30 调研：
- vpc-cni 网络模式：CNI 组件（cello）中，包含 cilium 容器，使得每个节点都会启动一个 `cilium-agent` 和 `cilium-operator`，使用 cilium 来替代 kube-proxy，作为集群内的 Service 转发组件。
- flannel 网络模式：不集成 cilium，会部署 kube-proxy 作为集群内的 Service 转发组件。
