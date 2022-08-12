# 腾讯云跨账号流量治理

## 需求场景

服务部署在不同腾讯云账号下，想统一在一个腾讯云账号下接入流量，部分流量可能会转发到其它腾讯云账号下的服务。

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812105933.png)

## 需求分析

多集群跨 VPC 流量管理，可以通过 [腾讯云服务网格](https://cloud.tencent.com/product/tcm)(TCM) + [云联网](https://cloud.tencent.com/product/ccn)(CCN) 来实现，自动对多个容器集群进行服务发现(Pod IP)，利用 isito ingressgateway 统一接入流量，然后直接转发到后端服务的 Pod IP:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812114344.png)

但这里需求关键点是跨账号，虽然跨账号网络也可以用云联网打通，但是 TCM 是无法直接管理其它账号下的集群的，原因很明显，关联集群时只能选择本账号下的集群，没有权限关联其它账号下的集群:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812112012.png)

幸运的是，我们可以利用 [云原生分布式云中心](https://cloud.tencent.com/product/tdcc)(TDCC) 来管理其它账号的集群 (TDCC 目前还在内测中，需提交 [内核申请](https://cloud.tencent.com/apply/p/897g10ltlv6) 进行开通)，将其它账号的集群注册到 TDCC 中，然后在 TCM 里添加 TDCC 中注册的集群，TCM 通过关联 TDCC 注册集群来间接对其它账号的集群进行服务发现，以实现多账号下的集群流量统一纳管:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812114733.png)

## 注意事项: 其它账号尽量使用独立集群

istio 注入 sidecar 时需要集群 apiserver 调用 TCM 控制面 webhook:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812123716.png)

如果使用托管集群(TKE托管集群或EKS集群)，apiserver 是用户不可见的，使用 169 开头的 IP，这个 IP 只在 VPC 内可用。

所以如果将账号B的托管集群注册到账号A的 TDCC 中，账号B的托管集群 apiserver 也无法调用到账号A的TCM控制面，就会导致无法注入 sidecar，而独立集群没这个问题，因为 apiserver 是部署在用户 CVM 上，使用 CVM 的 IP，打通云联网后网络就可以互通，所以推荐其它账号下的集群使用 TKE 独立集群。

当然如果能保证完全没有 sidecar 自动注入的需求，不需要账号 B 的服务通过网格的服务发现主动调用账号 A 的服务，使用托管集群也可以。

## TODO

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220811204947.png)