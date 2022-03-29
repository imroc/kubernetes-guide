# 局部启用 accesslog

## 背景

在生产环境中，有时我们不想全局启用 accesslog，只想为部分 namespace 或 workload 启用 accesslog，而 istio 对 accesslog 的配置是全局的，如何只为部分数据面启用 accesslog 呢？下面介绍具体操作方法。

## 为部分 namespace 启用 accesslog

可以使用以下 Envoyfilter 来实现:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: enable-accesslog
  namespace: test # 只为 test 命名空间开启 accesslog
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: ANY
      listener:
        filterChain:
          filter:
            name: envoy.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager"
          access_log:
          - name: envoy.access_loggers.file
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
              path: "/dev/stdout"
              log_format:
                json_format:
                  authority: "%REQ(:AUTHORITY)%"
                  bytes_received: "%BYTES_RECEIVED%"
                  bytes_sent: "%BYTES_SENT%"
                  downstream_local_address: "%DOWNSTREAM_LOCAL_ADDRESS%"
                  downstream_remote_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
                  duration: "%DURATION%"
                  method: "%REQ(:METHOD)%"
                  path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                  protocol: "%PROTOCOL%"
                  request_id: "%REQ(X-REQUEST-ID)%"
                  requested_server_name: "%REQUESTED_SERVER_NAME%"
                  response_code: "%RESPONSE_CODE%"
                  response_flags: "%RESPONSE_FLAGS%"
                  route_name: "%ROUTE_NAME%"
                  start_time: "%START_TIME%"
                  upstream_cluster: "%UPSTREAM_CLUSTER%"
                  upstream_host: "%UPSTREAM_HOST%"
                  upstream_local_address: "%UPSTREAM_LOCAL_ADDRESS%"
                  upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
                  upstream_transport_failure_reason: "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
                  user_agent: "%REQ(USER-AGENT)%"
                  x_forwarded_for: "%REQ(X-FORWARDED-FOR)%"
```

* 已测试版本 istio 1.8。
* 若不指定 `log_format` 将会使用 [Envoy Default Format String](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage#default-format-string) 。


## 为部分 workload 启用 accesslog

如果想要精确到只为指定的 workload 启用 accesslog，可以在 EnvoyFilter 上加一下 `workloadSelector`:

```yaml
spec:
  workloadSelector:
    labels:
      app: "nginx"
```

## 低版本 istio

低版本 istio 使用的 envoy 不支持 v3 api，可以使用 v2:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: enable-accesslog
  namespace: test # 只为 test 命名空间开启 accesslog
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: ANY
      listener:
        filterChain:
          filter:
            name: envoy.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": "type.googleapis.com/envoy.config.filter.network.http_connection_manager.v2.HttpConnectionManager"
          access_log:
          - name: envoy.file_access_log
            config:
              path: /dev/stdout
```