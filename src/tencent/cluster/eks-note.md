# EKS 弹性集群注意事项

## 访问公网

与 TKE 集群不同的是，EKS 没有节点，无法像 TKE 那样，Pod 可以利用节点自身的公网带宽访问公网。

EKS 没有节点，要让 Pod 访问公网有两种方式：

1. [通过 NAT 网关访问外网](https://cloud.tencent.com/document/product/457/48710)
2. [通过弹性公网 IP 访问外网](https://cloud.tencent.com/document/product/457/60354)

## 9100 端口

EKS 默认会在每个 Pod 的 9100 端口进行监听，暴露 Pod 相关监控指标，如果业务本身也监听 9100，会失败，参考 [9100 端口问题](https://imroc.cc/kubernetes/tencent/appendix/eks-annotations.html#9100-%E7%AB%AF%E5%8F%A3%E9%97%AE%E9%A2%98)