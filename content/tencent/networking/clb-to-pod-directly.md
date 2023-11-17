# 启用 CLB 直通 Pod

## 概述

TKE 提供了 CLB 直通 Pod 的能力，不经过 NodePort，网络链路上少了一跳，带来了一系列好处:

1. 链路更短，性能会有所提高。
2. 没有 SNAT，避免了流量集中可能导致的源端口耗尽、conntrack 插入冲突等问题。
3. 不经过 NodePort，也就不会再经过 k8s 的 iptables/ipvs 转发，从而负载均衡状态就都收敛到了 CLB 这一个地方，可避免负载均衡状态分散导致的全局负载不均问题。
4. 由于没有 SNAT，天然可以获取真实源 IP，不再需要 `externalTrafficPolicy: Local` 。
5. 实现会话保持更简单，只需要让 CLB 开启会话保持即可，不需要设置 Service 的 `sessionAffinity`。

虽然 CLB 直通 Pod 提供了这么多好处，但默认不会启用，本文介绍如何在 TKE 上启用 CLB 直通 Pod。

## 前提条件

1. `Kubernetes`集群版本需要高于 1.12，因为 CLB 直绑 Pod，检查 Pod 是否 Ready，除了看 Pod 是否 Running、是否通过 readinessProbe 外， 还需要看 LB 对 Pod 的健康探测是否通过，这依赖于 `ReadinessGate`  特性，该特性在 Kubernetes 1.12 才开始支持。
2. 集群网络模式必须开启 `VPC-CNI` 弹性网卡模式，因为目前 LB 直通 Pod 的实现是基于弹性网卡的，普通的网络模式暂时不支持，这个在未来将会支持。

## CLB 直通 Pod 启用方法

启用方法是在创建 Service 或 Ingress 时，声明一下要使用 CLB 直通 Pod。

### Service 声明 CLB 直通 Pod

当你用 LoadBalancer 的 Service 暴露服务时，需要声明使用直连模式：

* 如果通过控制台创建 Service，可以勾选 `采用负载均衡直连Pod模式`:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925161405.png)

* 如果通过 yaml 创建 Service，需要为 Service 加上 `service.cloud.tencent.com/direct-access: "true"` 的 annotation:

   ```yaml showLineNumbers
   apiVersion: v1
   kind: Service
   metadata:
     annotations:
       # highlight-next-line
       service.cloud.tencent.com/direct-access: "true" # 关键
     labels:
       app: nginx
     name: nginx-service-eni
   spec:
     externalTrafficPolicy: Cluster
     ports:
     - name: 80-80-no
       port: 80
       protocol: TCP
       targetPort: 80
     selector:
       app: nginx
     sessionAffinity: None
     type: LoadBalancer
   ```

### CLB Ingress 声明 CLB 直通 Pod

当使用 CLB Ingress 暴露服务时，同样也需要声明使用直连模式:

* 如果通过控制台创建 CLB Ingress，可以勾选 `采用负载均衡直连Pod模式`:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925161417.png)

* 如果通过 yaml 创建 CLB Ingress，需要为 Ingress 加上 `ingress.cloud.tencent.com/direct-access: "true"` 的 annotation:

   ```yaml showLineNumbers
   apiVersion: networking.k8s.io/v1beta1
   kind: Ingress
   metadata:
     annotations:
       # highlight-next-line
       ingress.cloud.tencent.com/direct-access: "true"
       kubernetes.io/ingress.class: qcloud
     name: test-ingress
     namespace: default
   spec:
     rules:
     - http:
         paths:
         - backend:
             serviceName: nginx
             servicePort: 80
           path: /
   ```

启用方法根据集群网络模式有细微差别，见下文分解。

### GlobalRouter + VPC-CNI 网络模式混用注意事项

如果 TKE 集群创建时，网络模式选择的 [GlobalRouter](https://cloud.tencent.com/document/product/457/50354) ，后面再开启的 [VPC-CNI](https://cloud.tencent.com/document/product/457/50355) ，这样集群的网络模式就是 GlobalRouter + VPC-CNI 两种网络模式混用。

这种集群创建的 Pod 默认没有使用弹性网卡，如果要启用 CLB 直通 Pod，首先在部署工作负载的时候，声明一下 Pod 要使用 VPC-CNI 模式 (弹性网卡)，具体操作方法是使用 yaml 创建工作负载 (不通过 TKE 控制台)，为 Pod 指定 `tke.cloud.tencent.com/networks: tke-route-eni` 这个 annotation 来声明使用弹性网卡，并且为其中一个容器加上 `tke.cloud.tencent.com/eni-ip: "1"`  这样的 requests 与 limits，示例:

```yaml showLineNumbers
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx-deployment-eni
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      annotations:
       # highlight-next-line
        tke.cloud.tencent.com/networks: tke-route-eni
      labels:
        app: nginx
    spec:
      containers:
        - image: nginx
          name: nginx
          resources:
            # highlight-start
            requests:
              tke.cloud.tencent.com/eni-ip: "1"
            limits:
              tke.cloud.tencent.com/eni-ip: "1"
            # highlight-end
```

## 参考资料

* [在 TKE 上使用负载均衡直通 Pod](https://cloud.tencent.com/document/product/457/48793)
