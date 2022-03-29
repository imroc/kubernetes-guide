# 设置 max_body_size

## 背景

nginx 可以设置 `client_max_body_size`，那么在 istio 场景下如何调整客户端的最大请求大小呢？

## 解决方案

可以配置 envoyfilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: limit-request-size
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.http_connection_manager
    patch:
      operation: INSERT_BEFORE
```
> 已验证版本: istio 1.8

* 更改 `workloadSelector` 以选中需要设置的 gateway