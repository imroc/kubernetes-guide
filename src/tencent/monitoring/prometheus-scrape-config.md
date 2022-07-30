# 对接自建 Prometheus

使用自建 Prometheus 采集腾讯云容器服务的监控数据时，主要需要注意的是 kubelet 与 cadvisor 的监控指标采集，本文介绍配置方法。

## 采集普通节点 cadvisor 数据