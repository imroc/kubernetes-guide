# ipvs 连接复用引发的系列问题

在 Kubernetes 社区里面有一个讨论已久的 bug ([#81775](https://github.com/kubernetes/kubernetes/issues/81775))，这个问题是当 client 对 service 发起大量新建 TCP 连接时，新的连接被转发到 Terminating 或已完全销毁的旧 Pod 上，导致持续丢包 (报错 `no route to host`)，其根因是内核 ipvs 连接复用引发，本文来详细掰扯下。

## conn_reuse_mode 简介

在介绍原因之前，我们先介绍下 `conn_reuse_mode` 这个内核参数，它是以下两个 patch 引入的:

1. year 2015 d752c364571743d696c2a54a449ce77550c35ac5
2. year 2016 f719e3754ee2f7275437e61a6afd520181fdd43b

其目的是:
1. 当 `client ip:client port` 复用发生时，对于 `TIME_WAIT` 状态下的 ip_vs_conn，进行重新调度，使得 connection 在 rs 上的分布更均衡，以提高性能。
2. 如果该 mode 是 0，则会复用旧 ip_vs_conn 里的 rs，使得连接更不均衡。

所以当 `conn_reuse_mode` 为 0 表示启用 ipvs 连接复用，为 1 表示不复用，是不是有点反直觉？这个确实也比较有争议。

## conn_resue_mode=1 的 bug

开启这个内核参数 (`conn_reuse_mode=1`) 本意是为了提高新建的性能，实际结果是大幅度降低了性能，实际测试中发现 cps 从 3w 降低到了 1.5K，这也表明内核社区的一些 patch 没有经过严格的性能测试。

开启这个内核参数实际就表示 ipvs 转发时不做连接复用，每次新建的连接都会重新调度 rs 并新建 ip_vs_conn，但它的实现有个问题: 在新建连接时 (SYN 包)，如果 `client ip:client port` 匹配到了 ipvs 旧连接 (`TIME_WIAT` 状态)，且使用了 conntrack，就会丢掉第一个 SYN 包，等待重传后 (1s) 才能成功建连，从而导致建连性能急剧下降。

Kubernetes 社区也发现了这个 bug，所以当 kube-proxy 使用 ipvs 转发模式时，默认将 `conn_reuse_mode` 置为 0 来规避这个问题，详见 PR [#71114](https://github.com/kubernetes/kubernetes/pull/71114) 与 issue [#70747](https://github.com/kubernetes/kubernetes/issues/70747) 。

## conn_resue_mode=0 引发的问题

由于 Kubernetes 为了规避 `conn_resue_mode=1` 带来的性能问题，在 ipvs 模式下，让 kube-proxy 在启动时将 `conn_resue_mode` 置为了 0 ，即使用 ipvs 连接复用的能力，但 ipvs 连接复用有两个问题:

1. 只要有 `client ip:client port` 匹配上 ip_vs_conn (发生复用)，就直接转发给对应的 rs，不管 rs 当前是什么状态，即便 rs 的 weight 为 0 (通常是 `TIME_WAIT` 状态) 也会转发，`TIME_WAIT` 的 rs 通常是 Terminating 状态已销毁的 Pod，转发过去的话连接就必然异常。
2. 高并发下大量复用，没有为新连接没有调度 rs，直接转发到所复用连接对应的 rs 上，导致很多新连接被 "固化" 到部分 rs 上。

业务中实际遇到的现象可能有很多种：

1. **滚动更新连接异常。** 被访问的服务滚动更新时，Pod 有新建有销毁，ipvs 发生连接复用时转发到了已销毁的 Pod 导致连接异常 (`no route to host`)。
2. **滚动更新负载不均。** 由于复用时不会重新调度连接，导致新连接也被 "固化" 在某些 Pod 上了。
3. **新扩容的 Pod 接收流量少。** 同样也是由于复用时不会重新调度连接，导致很多新连接被 "固化" 在扩容之前的这些 Pod 上了。

## 规避方案

我们知道了问题原因，那么在 ipvs 转发模式下该如何规避呢？我们从南北向和东西向分别考虑下。

### 南北向流量

1. 使用 LB 直通 Pod。对于南北向流量，通常依赖 NodePort 来暴露，前面的负载均衡器将流量先转到 NodePort 上，然后再通过 ipvs 转发到后端 Pod。现在很多云厂商都支持 LB 直通 Pod，这种模式下负载均衡器直接将请求转发到 Pod，不经过 NodePort，也就没有 ipvs 转发，从而在流量接入层规避这个问题。
2. 使用 ingress 转发。在集群中部署 ingress controller (比如 nginx ingress)，流量到达 ingress 再向后转时 (转发到集群内的 Pod)，不会经过 service 转发，而是直接转发到 service 对应的 `Pod IP:Port`，也就绕过了 ipvs。Ingress controller 本身结合使用前面所说的 LB 直通 Pod 方式部署，效果更佳。

### 东西向流量

集群内的服务间调用 (东西向流量)，默认还是会走 ipvs 转发。对于有这种高并发场景的业务，我们可以考虑使用 Serivce Mesh (如 istio) 来治理流量，服务间转发由 sidecar 代理，并且不会经过 ipvs。

## 终极方案: 内核修复

`conn_resue_mode=1` 引发性能急需下降的 bug，目前在腾讯云提供的 [TencentOS-kernel](https://github.com/Tencent/TencentOS-kernel) 开源内核已修复，对应 PR [#17](https://github.com/Tencent/TencentOS-kernel/pull/17)， [TKE](https://cloud.tencent.com/product/tke) 上的解决方案就是使用这个内核 patch，依赖禁用 ipvs 连接复用 (`conn_resue_mode=1`)，这样同时也就解决了 ipvs 连接复用引发的系列问题，且经过了大规模生产验证。

不过以上修复并未直接合并到 linux 社区，当前已有两个相关 patch 合并到了 linux 内核主干 (自 v5.9)，分别解决 `conn_resue_mode` 为 0 和 1 时的上述 bug，其中一个也是借鉴了腾讯云修复的思路，详见 k8s issue [#93297](https://github.com/kubernetes/kubernetes/issues/93297) 。

如果你使用了 v5.9 以上的内核，理论上就没有本文所述的问题了。既然 v5.9 以上的内核已修复上述 bug，那么 kube-proxy 就无需显式去设置 `conn_resue_mode` 这个内核参数了，这也是 PR [#102122](https://github.com/kubernetes/kubernetes/pull/102122) 所做的事。不过值得注意的是，社区 patch 目前并未看到有大规模的生产验证，试用有风险。