# 排查网络超时

本文记录网络超时的可能原因。

## 网络完全不通

如果发现是网络完全不通导致的超时，可以参考 [排查网络不通](network-unreachable.md)。

## 网络偶尔丢包

超时也可能是丢包导致的，参考 [排查网络丢包](packet-loss.md) 。

## cpu 限流 (throttled)

有以下情况 CPU 会被限流:

1. Pod 使用的 CPU 超过了 limit，会直接被限流。
2. 容器内同时在 running 状态的进程/线程数太多，内核 CFS 调度周期内无法保证容器所在 cgroup 内所有进程都分到足够的时间片运行，部分进程会被限流。
3. 内核态 CPU 占用过高也可能会影响到用户态任务执行，触发 cgroup 的 CPU throttle，有些内核态的任务是不可中断的，比如大量创建销毁进程，回收内存等任务，部分核陷入内核态过久，当切回用户态时发现该 CFS 调度周期时间所剩无几，部分进程也无法分到足够时间片从而被限流。

CPU 被限流后进程就运行变慢了，应用层的表现通常就是超时。

如果确认？可以查 Promehtues 监控，PromQL 查询语句:

1. cpu 被限制比例:

```txt
sum by (namespace, pod)(
    irate(container_cpu_cfs_throttled_periods_total{container!="POD", container!=""}[5m])
) /
sum by (namespace, pod)(
    irate(container_cpu_cfs_periods_total{container!="POD", container!=""}[5m])
)
```

2. cpu 被限制核数:

```txt
sum by (namespace, pod)(
    irate(container_cpu_cfs_throttled_periods_total{container!="POD", container!="", cluster="$cluster"}[5m])
)
```

如何确认超时就是 CPU throttle 导致的呢？建议：
1. 看下 throttle 严不严重，如果只有少了 throttle，可能不会导致超时。
2. 拉长监控图时间范围，对比开始超时的时间段与之前正常的时间段，是否都有 throttle，如果是有 throttle 或加重很多后才超时，那很可能是因为 throttle 导致的超时。

## 节点高负载

如果节点高负载了，即便没 throttle，进程所分配的 CPU 时间片也不够用，也会导致进程处理慢，从而超时，详见 [节点高负载排查思路](../node/node-high-load.md)
