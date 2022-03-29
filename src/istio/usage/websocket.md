# 使用 websocket 协议

业务使用的 websocket 协议，想跑在 istio 中，那么在 istio 中如何配置 websocket 呢？

## 用法

由于 websocket 本身基于 HTTP，所以在 istio 中直接按照普通 http 来配就行了:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: tornado-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: tornado
spec:
  hosts:
  - "*"
  gateways:
  - tornado-gateway
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: tornado
      weight: 100
```

## 参考资料

* 官方 sample: [Tornado - Demo Websockets App](https://github.com/istio/istio/tree/master/samples/websockets)
