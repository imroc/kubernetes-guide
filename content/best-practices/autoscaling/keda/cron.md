# 定时水平伸缩 (Cron 触发器)

## Cron 触发器

KEDA 支持 Cron 触发器，即使用 Cron 表达式来配置周期性的定时扩缩容，用法参考 [KEDA Scalers: Cron](https://keda.sh/docs/latest/scalers/cron/)。

Cron 触发器适用于有周期性特征的业务，比如业务流量有固定的周期性波峰和波谷特征。

## 案例：每天固定时间点的秒杀活动

秒杀活动的特征是时间比较固定，可以在活动开始前提前扩容，以下展示了 `ScaledObject` 配置示例。

```yaml showLineNumbers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: seckill
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: seckill
  pollingInterval: 15
  minReplicaCount: 2 # 至少保留 2 个副本
  maxReplicaCount: 1000
  advanced:
    horizontalPodAutoscalerConfig:
      behavior: # 控制扩缩容行为，使用比较保守的策略，快速扩容，缓慢缩容
        scaleDown: # 缓慢缩容：至少冷却 10 分钟才能缩容
          stabilizationWindowSeconds: 600
          policies:
            - type: Percent
              value: 100
              periodSeconds: 15
        scaleUp: # 快速扩容：每 15s 最多允许扩容 5 倍
          policies:
            - type: Percent
              value: 500
              periodSeconds: 15
  triggers:
    # highlight-start
    - type: cron # 每天早上 10 点秒杀活动，确保前后半小时内至少有 200 个副本
      metadata:
        timezone: Asia/Shanghai
        start: 30 9 * * *
        end: 30 10 * * *
        desiredReplicas: "200"
    - type: cron # 每天晚上 6 点秒杀活动，确保前后半小时内至少有 200 个副本
      metadata:
        timezone: Asia/Shanghai
        start: 30 17 * * *
        end: 30 18 * * *
        desiredReplicas: "200"
    # highlight-end
    - type: memory # CPU 利用率超过 60% 扩容
      metricType: Utilization
      metadata:
        value: "60"
    - type: cpu # 内存利用率超过 60% 扩容
      metricType: Utilization
      metadata:
        value: "60"
```

## 注意事项

通常触发器不能只配置 Cron，还需和其它触发器一起配合使用，因为如果在 cron 的 start 和 end 区间之外的时间段，如果没有其它触发器活跃，副本数就会降到 `minReplicaCount`，可能并不是我们想要的。
