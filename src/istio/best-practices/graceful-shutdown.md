# istio 优雅终止

## 概述

本文介绍在 istio 场景下实现优雅终止时需要重点关注的点，一些容器场景通用的关注点请参考 [Kubenretes 最佳实践: 优雅终止](../../best-practices/graceful-shutdown/README.md) 。

## envoy 被强杀导致流量异常

当业务上了 istio 之后，流量被 sidecar 劫持，进程之间不会直接建立连接，而是经过了 sidecar 这一层代理:

![](graceful-shutdown-1.jpg)

当 Pod 开始停止时，它将从服务的 endpoints 中摘除掉，不再转发流量给它，同时 Sidecar 也会收到 `SIGTERM` 信号，立刻不再接受 inbound 新连接，但会保持存量 inbound 连接继续处理，outbound 方向流量仍然可以正常发起。

不过有个值得注意的细节，若 Pod 没有很快退出，istio 默认是会在停止开始的 5s 后强制杀死 envoy，当 envoy 进程不在了也就无法转发任何流量(不管是 inbound 还是 outbound 方向)，所以就可能存在一些问题:

1. 若被停止的服务提供的接口耗时本身较长(比如文本转语音)，存量 inbound 请求可能无法被处理完就断开了。
2. 若停止的过程需要调用其它服务(比如通知其它服务进行清理)，outbound 请求可能会调用失败。

## 自定义 terminationDrainDuration

istio 提供了 `terminationDrainDuration` 这个连接优雅终止时长的自定义配置，表示 sleep 多长时间之后才强制杀死 envoy，默认是 5s，可以使用 `proxy.istio.io/config` 这个 [Resource Annotation](https://istio.io/latest/docs/reference/config/annotations/) 来对需要自定义连接优雅终止时长的服务配置 `terminationDrainDuration`，用法示例:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 60s # 这里自定义 Envoy 优雅终止时长
      labels:
        app: nginx
    spec:
      terminationGracePeriodSeconds: 60 # 若 terminationDrainDuration 超时 30s 则显式指定 terminationGracePeriodSeconds
      containers:
      - name: nginx
        image: "nginx"
```

* 如果 `terminationDrainDuration` 大于 30s，需要显式给 Pod 指定 `terminationGracePeriodSeconds`，因为这个值默认为 30s，即 30s 之后容器内进程还未退出就发 SIGKILL 信号将其强制杀死。所以要确保 `terminationGracePeriodSeconds` 大于等于 `terminationDrainDuration` 才好让优雅终止时长完全生效。
* `terminationDrainDuration` 设置的越大，同时也意味着 Pod 会停止得越慢，所以建议根据业务场景进行自定义，只给需要的服务进行合理自定义，其它情况可以使用默认值。

### 使用 preStop

如果业务停止需要的时长不太固定，不好使用固定的 `terminationDrainDuration` 去控制 sidecar 停止时间，其实也可以通过给 sidecar 加一个 preStop 脚本，在脚本里通过判断是否还要连接来间接判断应用是否已经退出，等应用退出了之后 envoy 才真正开始退出 (默认再等 5s)。

添加 preStop 可以通过修改 sidecar injector 的全局 configmap 来实现:

```bash
kubectl -n istio-system edit configmap istio-sidecar-injector
```

> 如果使用 TCM，托管网格添加 preStop 需要提工单后台操作，独立网格可以自行修改主集群里的 configmap，但 configmap 名称和这里不一样，会带上版本后缀。

在 values 里面的 `global.proxy` 加入以下 lifecycle 字段:

```json
          "lifecycle": {
            "preStop": {
              "exec": {
                "command": ["/bin/sh", "-c", "while [ $(netstat -plunt | grep tcp | grep -v envoy | wc -l | xargs) -ne 0 ]; do sleep 1; done"]
              },
            },
          },
```

## 参考资料

* [istio 常见问题: Sidecar 停止问题](https://imroc.cc/istio/faq/sidecar-shutdown/)