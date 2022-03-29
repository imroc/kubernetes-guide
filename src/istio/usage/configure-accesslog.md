# 配置 accesslog

本文介绍如何配置 istio 的 accesslog。

## 全局配置方法

修改 istio 配置:

```bash
kubectl -n istio-system edit configmap istio
```

编辑 yaml:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    accessLogEncoding: JSON
    accessLogFile: /dev/stdout
    accessLogFormat: ""
```

* `accessLogEncoding`: 表示 accesslog 输出格式，istio 预定义了 `TEXT` 和 `JSON` 两种日志输出格式。默认使用 `TEXT`，通常我们习惯改成 `JSON` 以提升可读性，同时也利于日志采集。
* `accessLogFile`: 表示 accesslog 输出到哪里，通常我们指定到 `/dev/stdout` (标准输出)，以便使用 `kubectl logs` 来查看日志，同时也利于日志采集。
* `accessLogFormat`: 如果不想使用 istio 预定义的 `accessLogEncoding`，我们也可以使用这个配置来自定义日志输出格式。完整的格式规则与变量列表参考 [Envoy 官方文档](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage) 。

如果使用 istioctl 安装的 istio，也可以用类似以下命令进行配置:

```bash
istioctl install --set profile=demo --set meshConfig.accessLogFile="/dev/stdout" --set meshConfig.accessLogEncoding="JSON"
```

## 局部启用 accesslog

在生产环境中，有时我们不想全局启用 accesslog，我们可以利用 EnvoyFilter 来实现只为部分 namespace 或 workload 启用 accesslog，参考 [实用技巧: 局部启用 accesslog](../trick/partially-enable-accesslog.md)

## 日志格式

### TEXT 格式

istio 的 text accesslog 配置格式见 [源码](https://github.com/istio/istio/blob/1.8.3/pilot/pkg/networking/core/v1alpha3/accesslog.go#L38) 。转换成字符串为:

```txt
[%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%" %RESPONSE_CODE% %RESPONSE_FLAGS% "%UPSTREAM_TRANSPORT_FAILURE_REASON%" %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%" "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%" "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER% %UPSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_LOCAL_ADDRESS% %DOWNSTREAM_REMOTE_ADDRESS% %REQUESTED_SERVER_NAME% %ROUTE_NAME%
```

### JSON 格式

istio 的 json accesslog 配置格式见 [源码](https://github.com/istio/istio/blob/1.8.3/pilot/pkg/networking/core/v1alpha3/accesslog.go#L63) 。转换成字符串为:

```json
{
  "authority": "%REQ(:AUTHORITY)%",
  "bytes_received": "%BYTES_RECEIVED%",
  "bytes_sent": "%BYTES_SENT%",
  "downstream_local_address": "%DOWNSTREAM_LOCAL_ADDRESS%",
  "downstream_remote_address": "%DOWNSTREAM_REMOTE_ADDRESS%",
  "duration": "%DURATION%",
  "istio_policy_status": "%DYNAMIC_METADATA(istio.mixer:status)%",
  "method": "%REQ(:METHOD)%",
  "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
  "protocol": "%PROTOCOL%",
  "request_id": "%REQ(X-REQUEST-ID)%",
  "requested_server_name": "%REQUESTED_SERVER_NAME%",
  "response_code": "%RESPONSE_CODE%",
  "response_flags": "%RESPONSE_FLAGS%",
  "route_name": "%ROUTE_NAME%",
  "start_time": "%START_TIME%",
  "upstream_cluster": "%UPSTREAM_CLUSTER%",
  "upstream_host": "%UPSTREAM_HOST%",
  "upstream_local_address": "%UPSTREAM_LOCAL_ADDRESS%",
  "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
  "upstream_transport_failure_reason": "%UPSTREAM_TRANSPORT_FAILURE_REASON%",
  "user_agent": "%REQ(USER-AGENT)%",
  "x_forwarded_for": "%REQ(X-FORWARDED-FOR)%"
}
```

## 参考资料

* [istio 官方文档给出的常见变量的示例](https://istio.io/latest/docs/tasks/observability/logs/access-log/#default-access-log-format)