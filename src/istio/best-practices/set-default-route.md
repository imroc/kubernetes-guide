# 为服务设置默认路由

很多时候一开始我们的服务没有多个版本，也没配置 vs，只有一个 deployment 和一个 svc，如果我们要为业务配置默认流量策略，可以直接创建 dr，给对应 host 设置 trafficPolicy，示例:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
  subsets:
  - name: v1
    labels:
      version: v1
```

需要注意的是，虽然 subsets 下也可以设置 trafficPolicy，但 subsets 下设置的不是默认策略，而且在没有 vs 明确指定路由到对应 subset 时，即便我们的服务只有一个版本，istio 也不会使用 subset 下指定的 trafficPolicy，错误示例:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
```

想要做的更好，可以定义下 vs，明确路由到指定版本(后续就可以针对不同版本指定不同的流量策略):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
```