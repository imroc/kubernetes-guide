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

当然如果能保证完全没有 sidecar 自动注入的需求，不需要账号 B 的服务通过网格的服务发现主动调用账号 A 的服务，这种情况使用托管集群也可以。

## 操作步骤

### 准备集群

在账号A下(用于接入流量的账号)，准备好一个或多个 TKE/EKS 集群，在其它账号准备好 TKE 独立集群。

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812141030.png)

注意，一定保证所有集群使用的网段互不冲突。

### 使用云联网打通网络

登录账号A，进入[云联网控制台](https://console.cloud.tencent.com/vpc/ccn)里，新建一个云联网，然后点击【新增实例】，将需要账号A下需要打通网络的VPC全部关联进来:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812141458.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812141636.png)

登录其它账号，进入[VPC控制台](https://console.cloud.tencent.com/vpc/vpc)，点击进入需要与账号A打通网络的VPC，点【立即关联】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812141906.png)

选择【其它账号】，输入账号A的ID以及前面创建的云联网的ID以申请加入账号A创建的云联网:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812142033.png)

然后再登录账号A，点进前面创建的云联网，同意其它账号VPC加入云联网的申请:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812142351.png)

不出意外，不同账号不同 VPC 成功通过云联网打通网络:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812142710.png)

如果你使用了 TKE 集群的 Global Router 网络模式，在集群基本信息页面，将容器网络注册到云联网的开关打开，以便让 Global Router 网络模式的容器 IP 通过云联网下发给所有其它 VPC:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812143110.png)

### 创建服务网格

## TODO

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220811204947.png)