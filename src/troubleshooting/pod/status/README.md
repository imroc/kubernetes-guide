# 排查 Pod 状态异常

本节分享 Pod 状态异常的排查思路与可能原因。

## 常见异常状态排查

- [Terminating](pod-terminating.md)
- [Pending](pod-pending.md)
- [ContainerCreating 或 Waiting](pod-containercreating-or-waiting.md)
- [CrashLoopBackOff](pod-crash.md)
- [ImagePullBackOff](pod-imagepullbackoff.md)

## ImageInspectError

通常是镜像文件损坏了，可以尝试删除损坏的镜像重新拉取。

## Error

通常处于 Error 状态说明 Pod 启动过程中发生了错误。常见的原因包括：

* 依赖的 ConfigMap、Secret 或者 PV 等不存在。
* 请求的资源超过了管理员设置的限制，比如超过了 LimitRange 等。
* 违反集群的安全策略，比如违反了 PodSecurityPolicy 等。
* 容器无权操作集群内的资源，比如开启 RBAC 后，需要为 ServiceAccount 配置角色绑定。

## Unknown

通常是节点失联，没有上报状态给 apiserver，到达阀值后 controller-manager 认为节点失联并将其状态置为 `Unknown`。

可能原因:

* 节点高负载导致无法上报。
* 节点宕机。
* 节点被关机。
* 网络不通。
