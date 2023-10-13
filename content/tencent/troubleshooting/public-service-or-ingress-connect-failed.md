# 排查公网服务不通

## 问题描述

部署在 TKE 集群内的服务使用公网对外暴露 (LoadBalancer 类型 Service 或 Ingress)，但访问不通。

## 常见原因

### 节点安全组没放通 NodePort

如果服务使用 TKE 默认的公网 Service 或 Ingress 暴露，CLB 会转发流量到 NodePort，流量转发链路是: client –> CLB –> NodePort –> ...

CLB 转发的数据包不会做 SNAT，所以报文到达节点时源 IP 就是 client 的公网 IP，如果节点安全组入站规则没有放通 client –> NodePort 链路的话，是访问不通的。

**解决方案1:** 节点安全组入站规则对公网访问 NodePort 区间端口(30000-32768):

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925162137.png)

**解决方案2:** 若担心直接放开整个 NodePort 区间所有端口有安全风险，可以只暴露 service 所用到的 NodePort (比较麻烦)。

**解决方案3:** 若只允许固定 IP 段的 client 访问 ingressgateway，可以只对这个 IP 段放开整个 NodePort 区间所有端口。

**解决方案4:** 启用 CLB 直通 Pod，这样流量就不经过 NodePort，所以就没有此安全组问题。启用 CLB 直通 Pod 需要集群网络支持 VPC-CNI，详细请参考 [如何启用 CLB 直通 Pod](https://imroc.cc/k8s/tke/faq/loadblancer-to-pod-directly/) 。

### 使用了 ClusterIP 类型 Service

如果使用 TKE 默认的 CLB Ingress 暴露服务，依赖后端 Service 要有 NodePort，如果 Service 是 ClusterIP 类型，将无法转发，也就不通。

**解决方案1**: Ingress 涉及的后端 Service 改为 NodePort 类型。

**解决方案2:** 不使用 TKE 默认的 CLB Ingress，其它类型 Ingress，比如 [Nginx Ingress](https://cloud.tencent.com/document/product/457/50502) 。
