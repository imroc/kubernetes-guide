# 腾讯云跨账号流量统一接入与治理方案

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

### 开通 TDCC

登录账号A，进入 [TDCC 控制台](https://console.cloud.tencent.com/tdcc)，首次进入需要按流程进行开通操作。

首先会提示为 TDCC 进行授权:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812143957.png)

点击【同意授权】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812143719.png)

选择要开通的 TDCC 所在地域以及 VPC 与子网:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812144338.png)

需要注意的是:
* TDCC 是多集群的控制面，可以同时管理多个地域的集群，尽量将 TDCC 所在地域选在服务部署的地域，如果服务分散在多个地域，或者 TDCC 还不支持服务所在地域，可以尽量选择离服务近一点的地域，尽量降低 TDCC 控制面到集群之间的时延。
* TDCC 与集群如果跨地域，仅仅增加一点控制面之间的时延，不影响数据面。数据面之间的转发时延只取决于集群之间的距离，与 TDCC 无关，比如，集群都在成都地域，但 TDCC 不支持成都，可以将 TDCC 选择广州。
* 可以将 TDCC 所在 VPC 也加入到云联网，这样其它账号注册集群到 TDCC 时就可以使用内网方式，网络稳定性更有保障。

等待 TDCC 的 Hub 集群创建完成:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812150235.png)

完成后，在 [TDCC 集群列表页面](https://console.cloud.tencent.com/tdcc/cluster)，点击【注册已有集群】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812150408.png)

虽然其它账号使用的 TKE 独立集群，但这里一定要选择 【非TKE集群】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812150500.png)

> 因为如果选 【TKE集群】，只能选到本账号的，其它账号的选不了。

选择其它账号集群实际所在地域，然后点【完成】，回到集群列表页面，点击【查看注册命令】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812151006.png)

可以看到自动生成的 yaml，将其下载下来，保存成 `agent.yaml`:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812151205.png)

然后 kubectl 的 context 切换到其它账号中要注册到 TDCC 的集群，使用 kubectl 将 yaml apply 进去:

```bash
kubectl apply -f agent.yaml
```

不出意外，TDCC 集群列表页面可以看到注册集群状态变为了`运行中`，即将其它账号下的集群成功注册到 TDCC:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812151528.png)

### 创建服务网格

登录账号A，进入 [TCM 控制台](https://console.cloud.tencent.com/tke2/mesh)，点【新建】来创建一个服务网格:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812151827.png)

推荐选择最高版本 istio，托管网格:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812152008.png)

> 服务发现就是关联集群，可以在创建网格时就关联，也可以等创建完再关联。

如果将 TDCC 中的注册集群关联进 TCM？在关联集群时，选择 TDCC 所在地域和注册集群类型，然后就可以下拉选择其它账号下注册进来的集群了:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812152410.png)

不出意外，账号A和其它账号的集群都关联到同一个服务网格了:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220811204947.png)

### 创建 Ingress Gateway

进入账号A创建的网格，在基本信息页面里创建 Ingress Gateway:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812160625.png)

配置一下 Ingress Gateway，`接入集群` 选要统一接入流量的集群:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812161504.png)

创建好后，点进去:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812161751.png)

可以看到创建出来的 CLB IP 地址以及对应的 CLB ID:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812161959.png)

> 如有需要，创建 Ingress Gateway 时也可以选择已有 CLB。

Ingress Gateway 组件创建好了，再创建一个 Gateway 对象与之关联:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812163550.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812163740.png)

也可以直接用 yaml 创建:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: cluster
  namespace: istio-system
spec:
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: HTTP-80
      protocol: HTTP
    hosts:
    - "*.imroc.cc"
```

### 配置 DNS 解析

将三个不同的域名都解析到前面创建的 Ingress Gateway 的 CLB IP:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812162136.png)

验证一下是否都正确解析到了同一个 IP:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812162402.png)

### 部署测试服务

分别在几个集群部署服务，这里给出一个示例，将 3 个不同服务分别部署在不同集群中，其中一个集群在其它账号下:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812153613.png)

* 3 个服务使用不同域名，但 DNS 都指向同一个 ingressgateway，统一接入流量。
* 根据不同域名转发给不同的服务。

服务部署使用 [prism](https://stoplight.io/open-source/prism)，模拟不同服务的返回不同，访问根路径分别返回字符串`cluster1`、`cluster2`与`cluster3`。

第一个服务的 yaml (`cluster1.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster1-conf
  namespace: test
data:
  mock.yaml: |
    openapi: 3.0.3
    info:
      title: MockServer
      description: MockServer
      version: 1.0.0
    paths:
      '/':
        get:
          responses:
            '200':
              content:
                'text/plain':
                  schema:
                    type: string
                    example: cluster1
---
apiVersion: v1
kind: Service
metadata:
  name: cluster1
  namespace: test
  labels:
    app: cluster1
spec:
  type: ClusterIP
  ports:
  - port: 80
    name: http
    protocol: TCP
    targetPort: 80
  selector:
    app: cluster1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster1
  namespace: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster1
      version: v1
  template:
    metadata:
      labels:
        app: cluster1
        version: v1
    spec:
      containers:
      - name: cluster1
        image: stoplight/prism:4
        args:
        - mock
        - -h
        - 0.0.0.0
        - -p
        - "80"
        - /etc/prism/mock.yaml
        volumeMounts:
        - mountPath: /etc/prism
          name: config
      volumes:
      - name: config
        configMap:
          name: cluster1-conf
```

将其 apply 到账号 A 的集群1:

```bash
kubectl create ns test
kubectl apply -f cluster1.yaml
```

等待部署成功:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812155724.png)

第二个服务的 yaml (`cluster2.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster2-conf
  namespace: test
data:
  mock.yaml: |
    openapi: 3.0.3
    info:
      title: MockServer
      description: MockServer
      version: 1.0.0
    paths:
      '/':
        get:
          responses:
            '200':
              content:
                'text/plain':
                  schema:
                    type: string
                    example: cluster2
---
apiVersion: v1
kind: Service
metadata:
  name: cluster2
  namespace: test
  labels:
    app: cluster2
spec:
  type: ClusterIP
  ports:
  - port: 80
    name: http
    protocol: TCP
    targetPort: 80
  selector:
    app: cluster2

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster2
  namespace: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster2
      version: v1
  template:
    metadata:
      labels:
        app: cluster2
        version: v1
    spec:
      containers:
      - name: cluster2
        image: stoplight/prism:4
        args:
        - mock
        - -h
        - 0.0.0.0
        - -p
        - "80"
        - /etc/prism/mock.yaml
        volumeMounts:
        - mountPath: /etc/prism
          name: config
      volumes:
      - name: config
        configMap:
          name: cluster2-conf
```

将其 apply 到账号 A 的集群2:

```bash
kubectl create ns test
kubectl apply -f cluster2.yaml
```

类似的，第三个服务的 yaml (`cluster3.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster3-conf
  namespace: test
data:
  mock.yaml: |
    openapi: 3.0.3
    info:
      title: MockServer
      description: MockServer
      version: 1.0.0
    paths:
      '/':
        get:
          responses:
            '200':
              content:
                'text/plain':
                  schema:
                    type: string
                    example: cluster3
---
apiVersion: v1
kind: Service
metadata:
  name: cluster3
  namespace: test
  labels:
    app: cluster3
spec:
  type: ClusterIP
  ports:
  - port: 80
    name: http
    protocol: TCP
    targetPort: 80
  selector:
    app: cluster3

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster3
  namespace: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster3
      version: v1
  template:
    metadata:
      labels:
        app: cluster3
        version: v1
    spec:
      containers:
      - name: cluster3
        image: stoplight/prism:4
        args:
        - mock
        - -h
        - 0.0.0.0
        - -p
        - "80"
        - /etc/prism/mock.yaml
        volumeMounts:
        - mountPath: /etc/prism
          name: config
      volumes:
      - name: config
        configMap:
          name: cluster3-conf
```

将其 apply 到另一个账号的集群:

```bash
kubectl create ns test
kubectl apply -f cluster3.yaml
```

### 配置 VirtualService 规则

可以在 TCM 控制台可视化操作，也可以用 apply yaml，这里示例使用 yaml。

首先，为三个不同服务创建对应的 VirtualService 并与 Gateway 关联:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cluster1-imroc-cc
  namespace: test
spec:
  gateways:
  - istio-system/cluster
  hosts:
  - 'cluster1.imroc.cc'
  http:
  - route:
    - destination:
        host: cluster1.test.svc.cluster.local
        port:
          number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cluster2-imroc-cc
  namespace: test
spec:
  gateways:
  - istio-system/cluster
  hosts:
  - 'cluster2.imroc.cc'
  http:
  - route:
    - destination:
        host: cluster2.test.svc.cluster.local
        port:
          number: 80
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cluster3-imroc-cc
  namespace: test
spec:
  gateways:
  - istio-system/cluster
  hosts:
  - cluster3.imroc.cc
  http:
  - route:
    - destination:
        host: cluster3.test.svc.cluster.local
        port:
          number: 80
```

### 测试效果

使用 curl 请求不同服务的域名，可以看到将请求均正确转发到了对应的集群，并响应了对应不同的结果:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220812164255.png)

## 总结

本文给出了在腾讯云上利用 TCM+CCN+TDCC 实现跨账号多集群流量统一接入和治理的方案，示例中的功能相对简单，如有需要，还可以自行配置 istio 规则实现更细粒度的流量治理，比如根据不同 url 路径转发到不同集群的服务，甚至相同 url 同时转发到不同集群，配置流量比例等。