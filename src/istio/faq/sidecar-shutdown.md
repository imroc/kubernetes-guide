# Sidecar 停止问题

## 背景

Istio 在 1.1 版本之前有个问题: Pod 销毁时，如果进程在退出过程中继续调用其它服务 (比如通知另外的服务进行清理)，会调用失败。

更多详细信息请参考 issue [#7136: Envoy shutting down before the thing it's wrapping can cause failed requests ](https://github.com/istio/istio/issues/7136) 。

## 原因

Kubernetes 在销毁 Pod 的过程中，会同时给所有容器发送 SIGTERM 信号，所以 Envoy 跟业务容器同时开始停止，Envoy 停止过程中不接受 inbound 新连接，默认在 5s 内会接收 outbound 新连接，5s 后 envoy 被强制杀死。又由于 istio 会进行流量劫持，所有 outbound 流量都会经过 Envoy 进行转发，如果 Envoy 被杀死，outbound 流量无法被转发，就会导致业务调用其它服务失败。

## 社区解决方案

如果 Kubernetes 自身支持容器依赖管理，那这个问题自然就可以解决掉。社区也提出了 [Sidecar Container](https://github.com/kubernetes/enhancements/issues/753) 的特性，只可惜最终还是被废弃了，新的方案还未落地，详细可参考 [这篇笔记](https://imroc.cc/k8s/kep/sidecar-containers.html) 。

后来随着 istio 社区的推进，针对优雅终止场景进行了一些优化:

* 2019-02: Liam White 提交 PR [Envoy Graceful Shutdown](https://github.com/istio/istio/pull/11485) ，让 Pod 在停止过程中 Envoy 能够实现优雅停止 (保持存量连接继续处理，但拒绝所有新连接)，等待 `terminationDrainDuration` 时长后再停掉 envoy 实例。该 PR 最终被合入 istio 1.1。
* 2019-11: Rama Chavali 提交 PR [move to drain listeners admin endpoint](https://github.com/istio/istio/pull/18581) ，将 Envoy 优雅停止的方式从热重启改成调用 Envoy 后来自身提供的 admin 接口 ([/drain_listeners?inboundonly](https://www.envoyproxy.io/docs/envoy/latest/operations/admin#post--drain_listeners?inboundonly)) ，重点在于带上了 `inboundonly` 参数，即仅仅拒绝 inbound 方向的新连接，outbound 的新连接仍然可以正常发起，这也使得 Pod 在停止过程中业务进程继续调用其它服务得以实现。该 PR 最终被合入 istio 1.5。

所以在 istio 1.5 及其以上的版本，在 Pod 停止期间的一小段时间内 (默认 5s)，业务进程仍然可以对其它服务发请求。

## 如何解决 ?

考虑从自定义 `terminationDrainDuration` 或加 preStop 判断连接处理完两种方式之一，详细请参考 [istio 最佳实践: 优雅终止](../best-practices/graceful-shutdown.md) 。