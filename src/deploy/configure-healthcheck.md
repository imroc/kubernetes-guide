# 健康检查配置最佳实践

> 本文视频教程: [https://www.bilibili.com/video/BV16q4y1y7B9](https://www.bilibili.com/video/BV16q4y1y7B9)

本文分享 K8S 健康检查配置的最佳实践，文末也分享配置不当的案例。

## Kubernetes 健康检查介绍

K8S 支持三种健康检查：
1. 就绪检查(`readinessProbe`): Pod启动后，如果配了就绪检查，要等就绪检查探测成功，Pod Ready 状态变为 True，允许放流量进来；在运行期间如果突然探测失败，Ready 状态变为 False，摘除流量。
2. 存活检查(`livenessProbe`): Pod 在运行时，如果存活检查探测失败，会自动重启容器；值得注意的是，存活探测的结果不影响 Pod 的 Ready 状态，这也是许多同学可能误解的地方。
3. 启动检查(`startupProbe`): 作用是让存活检查和就绪检查的开始探测时间延后，等启动检查成功后再开始探测，通常用于避免业务进程启动慢导致存活检查失败而被无限重启。

所有检查检查配置格式都是一样的，只是字段名:
```yaml
livenessProbe:
  successThreshold: 1 # 1 次探测成功就认为健康
  failureThreshold: 2 # 连续 2 次探测失败认为不健康
  periodSeconds: 3 # 3s 探测一次
  timeoutSeconds: 2 # 2s 超时还没返回成功就认为不健康
  httpGet: # 探测 80 端口的 "/healthz" 这个 http 接口
    port: 80
    path: "/healthz"
```

## 所有提供服务的 container 都要加上 ReadinessProbe

如果你的容器对外提供了服务，监听了端口，那么都应该配上 ReadinessProbe，ReadinessProbe 不通过就视为 Pod 不健康，然后会自动将不健康的 Pod 踢出去，避免将业务流量转发给异常 Pod。

## 探测结果一定要真实反映业务健康状态

ReadinessProbe 探测结果要能真实反映业务层面的健康状态，通常是业务程序提供 HTTP 探测接口(K8S 原生支持 HTTP 探测)。如果是其它协议，也可以用脚本探测，在脚本里用支持业务所使用协议的探测程序去调用业务提供的探测接口。

## 不要轻易使用 LivenessProbe

LivenessProbe 失败会重启 Pod，不要轻易使用，除非你了解后果并且明白为什么你需要它，参考 [Liveness Probes are Dangerous](https://srcco.de/posts/kubernetes-liveness-probes-are-dangerous.html) 。

## LivenessProbe 条件要更宽松

如果使用 LivenessProbe，不要和 ReadinessProbe 设置成一样，需要更宽松一点，避免 Pod 频繁被重启。

通常是:
1. `failureThreshold` 设置得更大一点，避免因探测太敏感导致 Pod 很容易被重启。
2. 等待应用完全启动后才开始探测，如果你的 K8S 版本低于 1.18，可以将 LivenessProbe 的 `initialDelaySeconds` 加大一点，避免 Pod 因启动慢被无限重启；如果是 1.18 及其以上版本，可以配置 [StartProbe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-startup-probes)，保证等应用完全启动后才开始探测。

## LivenessProbe 探测逻辑里不要有外部依赖

LivenessProbe 探测逻辑里不要有外部依赖 (db, 其它 pod 等)，避免抖动导致级联故障。

## 避免使用 TCP 探测

有些时候 TCP 探测结果并不能真实反映业务真实情况,比如:
1. 程序 hang 死时， TCP 探测仍然能通过 (TCP 的 SYN 包探测端口是否存活在内核态完成，应用层不感知)。
2. 当程序正在优雅退出的过程中，端口监听还在，TCP 探测会成功，但业务层面已不再处理新请求了。

## 一个配置不合理引发的血案

故障现象: Pod 突然不断重启，期间有流量进入，这部分流量异常。

原因：
1. Pod 之前所在节点异常，重建漂移到了其它节点去启动。
2. Pod 重建后由于基础镜像中依赖的一个服务有问题导致启动较慢，因为同时配置了 ReadinessProbe 与 LivenessProbe，大概率是启动时所有健康检查都失败，达到 LivenessProbe 失败次数阈值，又被重启。
3. Pod 配置了 preStop 实现优雅终止，被重启前会先执行 preStop，优雅终止的时长较长，preStop 期间 ReadinessProbe 还会继续探测。
4. 探测方式使用的 TCP 探测，进程优雅终止过程中 TCP 探测仍然会成功(没完全退出前端口监听仍然存在)，但实际此时进程已不会处理新请求了。
5. LivenessProbe 结果不会影响 Pod Ready 状态，是否 Ready 主要取决于 ReadinessProbe 结果，由于 preStop 期间 ReadinessProbe 是成功的，Pod 就变 Ready 了。
6. Pod Ready 但实际无法处理请求，业务就会异常。

总结:
1. Pod 慢启动 + 存活探测 导致被无限重启。需要延长 `initialDelaySeconds` 或 [StartProbe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-startup-probes) 来保护慢启动容器。
2. TCP 探测方式不能完全真实反应业务健康状态，导致在优雅终止过程中，ReadinessProbe 探测成功让流量放进来而业务却不会处理，导致流量异常。需要使用更好的探测方式，建议业务提供 HTTP 探活接口，使用 HTTP 探测业务真实健康状态。