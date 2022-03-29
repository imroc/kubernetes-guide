# 隐藏自动添加的 server header

## 背景

出于安全考虑，希望隐藏 istio 自动添加的 `server: istio-envoy` 这样的 header。

## 解决方案

可以配置 envoyfilter ，让 envoy 返回响应时不自动添加 server 的 header，将HttpConnectionManager 的 server_header_transformation 设为 PASS_THROUGH(后端没返回该header时envoy也不会自动添加):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: hide-headers
  namespace: istio-system
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: ANY
      listener:
        filterChain:
          filter:
            name: "envoy.http_connection_manager"
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": "type.googleapis.com/envoy.config.filter.network.http_connection_manager.v2.HttpConnectionManager"
          server_header_transformation: PASS_THROUGH
```


##  参考资料

* [server_header_transformation 字段各个值的解释](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html#envoy-v3-api-enum-extensions-filters-network-http-connection-manager-v3-httpconnectionmanager-serverheadertransformation)