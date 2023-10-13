# 日志采集

本文介绍 Kubernetes 中，日志采集的最佳实践。

## 落盘文件还是标准输出？

在上 K8S 的过程中，往往会遇到一个问题：业务日志是输出到日志文件，还是输出到标准输出？哪种方式更好？

如果输出到日志文件，日志轮转就需要自己去完成，要么业务日志框架支持，要么用其它工具去轮转（比如 sidecar 与业务容器共享日志目录，然后 sidecar 中 crontab + logrotate 之类的工具去轮转)。

如果输出到标准输出（前提是容器主进程是业务进程)，日志轮转则是由 K8S 自动完成，业务不需要关心，对于非 docker 的运行时(比如 containerd)，日志轮转由 kubelet 完成，每个容器标准输出的日志轮转规则由 kubelet 以下两个参数决定:

```txt
--container-log-max-files int32    Set the maximum number of container log files that can be present for a container. The number must be >= 2. This flag can only be used with --container-runtime=remote. (default 5)
--container-log-max-size string    Set the maximum size (e.g. 10Mi) of container log file before it is rotated. This flag can only be used with --container-runtime=remote. (default "10Mi")
```

> 日志默认最多存储 5 个文件，每个最大 10Mi。

对于 docker 运行时，没有实现 CRI 接口，日志轮转由 docker 自身完成，在配置文件 `/etc/docker/daemon.json` 中配置:

``` json
{
"log-driver":"json-file",
"log-opts": {"max-size":"500m", "max-file":"3"}
}
```

输出到标准输出还有一些其它好处：

1. 日志内容可以通过标准 K8S API 获取到，比如使用 `kubectl logs` 或一些 K8S 管理平台的可视化界面查看(比如 Kubernetes Dashboard，KubeSphere, Rancher 以及云厂商的容器服务控制台等)。
2. 运维无需关注业务日志文件路径，可以更方便的使用统一的采集规则进行采集，减少运维复杂度。

**最佳实践**

如果你的应用已经足够云原生了，符合"单进程模型"，不再是富容器，那么应尽量将日志输出到标准输出，业务不需要关心日志轮转，使用日志采集工具采集容器标准输出。有一种例外的情况是，对于非 docker 运行时，如果你有单个容器的日志输出过快，速率持续超过 `30MB/s` 的话，kubelet 在轮转压缩的时候，可能会 "追不上"，迟迟读不到 EOF，轮转失败，最终可能导致磁盘爆满，这种情况还是建议输出到日志文件，自行轮转。

其它情况，可以先将日志落盘到文件，并自行轮转下。