# Pod 终止流程

我们先了解下容器在 Kubernetes 环境中的终止流程:

![](pod-termination-proccess.png)

1. Pod 被删除，状态变为 `Terminating`。从 API 层面看就是 Pod metadata 中的 deletionTimestamp 字段会被标记上删除时间。
2. kube-proxy watch 到了就开始更新转发规则，将 Pod 从 service 的 endpoint 列表中摘除掉，新的流量不再转发到该 Pod。
3. kubelet watch 到了就开始销毁 Pod。

    3.1. 如果 Pod 中有 container 配置了 [preStop Hook](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) ，将会执行。

    3.2. 发送 `SIGTERM` 信号给容器内主进程以通知容器进程开始优雅停止。

    3.3. 等待 container 中的主进程完全停止，如果在 `terminationGracePeriodSeconds` 内 (默认 30s) 还未完全停止，就发送 `SIGKILL` 信号将其强制杀死。

    3.4. 所有容器进程终止，清理 Pod 资源。

    3.5. 通知 APIServer Pod 销毁完成，完成 Pod 删除。