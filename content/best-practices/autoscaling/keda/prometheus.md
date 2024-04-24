# 基于 Prometheus 自定义指标的弹性伸缩

## Prometheus 触发器

KEDA 支持 `prometheus` 类型的触发器，即根据自定义的 PromQL 查询到的 Prometheus 指标数据进行伸缩，完整配置参数参考 [KEDA Scalers: Prometheus](https://keda.sh/docs/latest/scalers/prometheus/)，本文将给出使用案例。

## 对比 prometheus-adapter

[prometheus-adapter](https://github.com/kubernetes-sigs/prometheus-adapter) 也支持相同的能力，即根据 Prometheus 中的监控指标数据进行伸缩，但相比 KEDA 的方案有以下不足：

* 每次新增自定义指标，都要改动 `prometheus-adapter`  的配置，且改配置是集中式管理的，不支持通过 CRD 管理，配置维护起来比较麻烦。
* `prometheus-adapter` 的配置语法晦涩难懂，不能直接写 `PromQL`，需要学习一下 `prometheus-adapter` 的配置语法，有一定的学习成本，而 KEDA 的 prometheus 配置则非常简单，指标可以直接写 `PromQL`。
* `prometheus-adapter` 只支持根据 Prometheus 监控数据进行伸缩，而对于 KEDA 来说，Prometheus 只是众多触发器中的一种。

综上，推荐使用 KEDA 方案。

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
