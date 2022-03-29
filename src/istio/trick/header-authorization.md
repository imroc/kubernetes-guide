# 实现基于 Header 的授权

## 背景

部分业务场景在 http header 或 grpc metadata 中会有用户信息，想在 mesh 这一层来基于用户信息来对请求进行授权，如果不满足条件就让接口不返回相应的数据。

## 解决方案

Istio 的 AuthorizationPolicy 不支持基于 Header 的授权，但可以利用 VirtualService 来实现，匹配 http header (包括 grpc metadata)，然后再加一个默认路由，使用的固定故障注入返回 401，示例:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: helloworld-server
spec:
  hosts:
  - helloworld-server
  http:
  - name: whitelist
    match:
    - headers:
        end-user:
          regex: "roc"
    route:
    - destination:
        host: helloworld-server
        port:
          number: 9000
  - name: default
    route:
    - destination:
        host: helloworld-server
        port:
          number: 9000
    fault:
      abort:
        percentage:
          value: 100
        httpStatus: 401
```