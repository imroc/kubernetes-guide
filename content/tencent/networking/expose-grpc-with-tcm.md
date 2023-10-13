# 使用 TCM 对外暴露 gRPC 服务

## 背景

gRPC 是长连接服务，而长连接服务负载不均是通病，因为使用四层负载均衡的话，只能在连接调度层面负载均衡，但不能在请求级别负载均衡。不同连接上的请求数量、网络流量、请求耗时、存活时长等可能都不一样，就容易造成不同 Pod 的负载不一样。而 istio 天然支持 gRPC 负载均衡，即在七层进行负载均衡，可以将不同请求转发到不同后端，从而避免负载不均问题，腾讯云容器服务也对 istio 进行了产品化托管，产品叫 [TCM](https://cloud.tencent.com/product/tcm)，本文介绍如何使用 TCM 来暴露 gRPC 服务。

## 创建网格

进入 [TCM控制台](https://console.cloud.tencent.com/tke2/mesh)，新建一个网格，每个网格可以管理多个 TKE/EKS 集群，创建网格的时候就可以关联集群(创建完之后关联也可以):

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100428.png)

边缘代理网关通常会启用 Ingress Gateway，即将内部服务通过 CLB 暴露出来:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100440.png)

## 启用 sidecar 自动注入

网格创建好后，点进去，在 【服务】-【sidecar自动注入】中勾选要启用自动注入的 namespace:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100456.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100510.png)

gRPC 服务端部署在哪个 namespace 就勾选哪个。

## 部署 gRPC 服务端

将 gRPC 服务部署到网格中的一个集群，确保部署的 namespace 开启了sidecar自动注入:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      containers:
      - name: server
        image: docker.io/imroc/grpc_server:latest
        imagePullPolicy: Always
```

如果服务端在开启自动注入之前已经部署了，可以重建下服务端 Pod，重建后会触发自动注入。

## 创建 Service

给工作负载关联一个 Service，使用 yaml 创建:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: server
  namespace: test
  labels:
    app: server
spec:
  type: ClusterIP
  ports:
  - port: 8000
    protocol: TCP
    targetPort: 50051
    name: grpc
  selector:
    app: server
```

注意:

- 重点是端口的 name 要以 grpc 开头，也可以直接写 grpc，istio 通过 port name 识别协议类型。
- 不通过控制台创建的原因主要是因为控制台创建 Service 不支持为端口指定 name。

## 创建 Gateway

如果希望 gRPC 对集群外暴露，istio 需要确保有 Gateway 对象，如果没有创建，可以先创建一个，在 TCM 中这样操作，【Gateway】-【新建】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100526.png)

【网关列表】引用最开始创建的 Ingress Gateway，【协议端口】使用GRPC，指定的端口号为 CLB 要监听的端口号，【Hosts】为服务从外部被访问的IP或域名，通配符 `*` 表示匹配所有:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100539.png)

## 创建 VirtualService

VirtualService 是 istio 描述服务的基本对象，我们使用 VirtualService 将 gRPC 服务关联到 Gateway 上，就可以将服务暴露出去了，在 TCM 上这样操作，【Virtual Service】-【新建】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100605.png)

【名称】随意，【命名空间】为服务端所在命名空间，【关联Hosts】这里可以跟 Gateway 那里的设置保持一致，【挂载Gateway】选择前面创建的 Gateway，【类型】选HTTP(istio中http既可以路由http，也可以用于路由grpc)，【匹配条件】删除默认，不写条件，【目的端】选择服务端的 service + port:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100618.png)

保存后即可，然后就可以通过 CLB 暴露出来的地址访问 grpc 服务了，并且会自动在请求级别进行负载均衡，CLB 的地址取决于创建出来的 Ingress Gateway 所使用的 CLB，测试一下效果:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220722100628.png)

Virtual Service 如果通过 yaml 创建，可以参考下面示例:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: server
  namespace: test
spec:
  gateways:
  - test/grpc
  hosts:
  - '*'
  http:
  - route:
    - destination:
        host: server
```

## demo仓库

包含服务端代码示例、Dockerfile、部署 yaml 等。

仓库地址：[https://github.com/imroc/grpc-demo](https://github.com/imroc/grpc-demo)
