# 安装 aws-load-balancer-controller

## 概述

EKS 集群创建好后，默认只有一个 CLB (Classic Load Balancer) 类型的 Service 实现，托管的, 用户不可见，不感知。

通常要安装开源的 [AWS Load Balancer Controller](https://github.com/kubernetes-sigs/aws-load-balancer-controller) 作为 Service/Ingress 在 AWS 环境里的 LB 实现：
* Service 使用 NLB (Network Load Balancer) 实现，默认通过 MutatingWebhook 自动为 Service 加上 LoadBalancerClass 指定为 `service.k8s.aws/nlb` 来替代默认的 CLB 实现。
* Ingress 使用 ALB (Application Load Balancer) 实现。

