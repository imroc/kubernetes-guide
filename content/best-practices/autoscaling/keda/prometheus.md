# 基于 Prometheus 自定义指标的弹性伸缩

## Prometheus 触发器

KEDA 支持 `prometheus` 类型的触发器，即根据自定义的 PromQL 查询到的 Prometheus 指标数据进行伸缩，完整配置参数参考 [KEDA Scalers: Prometheus](https://keda.sh/docs/latest/scalers/prometheus/)，本文将给出一些使用示例。

## 案例：基于 istio 的 QPS 指标伸缩

如果你使用 isito，业务 Pod 注入了 sidecar，会自动暴露一些七层的监控指标，最常见的是 `istio_requests_total`，可以通过这个指标计算 QPS。

假设这种场景：A 服务需要根据 B 服务处理的 QPS 进行伸缩。

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: b-scaledobject
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: a # 对 A 服务进行伸缩
  pollingInterval: 15
  minReplicaCount: 1
  maxReplicaCount: 100
  triggers:
    # highlight-start
    - type: prometheus
      metadata:
        serverAddress: http://monitoring-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090 # 替换 Prometheus 的地址
        query: | # 计算 B 服务 QPS 的 PromQL
          sum(irate(istio_requests_total{reporter=~"destination",destination_workload_namespace=~"prod",destination_workload=~"b"}[1m]))
        threshold: "100" # A服务副本数=ceil(B服务QPS/100)
    # highlight-end
```
