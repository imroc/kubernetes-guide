# 合理使用 preStop

若你的业务代码中没有处理 `SIGTERM` 信号，或者你无法控制使用的第三方库或系统来增加优雅终止的逻辑，也可以尝试为 Pod 配置下 preStop，在这里面实现优雅终止的逻辑，示例:

```yaml
        lifecycle:
          preStop:
            exec:
              command:
              - /clean.sh
```

> 参考 [Kubernetes API 文档](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#lifecycle-1)

在某些极端情况下，Pod 被删除的一小段时间内，仍然可能有新连接被转发过来，因为 kubelet 与 kube-proxy 同时 watch 到 pod 被删除，kubelet 有可能在 kube-proxy 同步完规则前就已经停止容器了，这时可能导致一些新的连接被转发到正在删除的 Pod，而通常情况下，当应用受到 `SIGTERM` 后都不再接受新连接，只保持存量连接继续处理，所以就可能导致 Pod 删除的瞬间部分请求失败。

这种情况下，我们也可以利用 preStop 先 sleep 一小下，等待 kube-proxy 完成规则同步再开始停止容器内进程:

```yaml
        lifecycle:
          preStop:
            exec:
              command:
              - sleep
              - 5s
```