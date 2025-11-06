# 设置调谐触发条件

## 默认触发条件

kubebuilder 创建的 Controller 脚手架代码，触发 Controller 调谐的条件默认是 Controller 对应 CR 发生变化（增、删、改）:

```go
// SetupWithManager sets up the controller with the Manager.
func (r *PodReconciler) SetupWithManager(mgr ctrl.Manager) error {
  return ctrl.NewControllerManagedBy(mgr).
    For(&corev1.Pod{}).
    Named("pod").
    Complete(r)
}
```

For 传入 Controller 管理的 CR 对象，当 CR 发生任何变化时，controller 会进行调谐。

## 仅针对满足特定条件的资源触发调谐

可以通过 handler.EnqueueRequestsFromMapFunc 函数，设置仅针对满足特定条件的资源触发调谐。

下面示例是过滤带有 `example-annotation` 注解的 Pod，当存在该注解的 Pod 发生变化时，controller 才会进行调谐：

```go showLineNumbers
import (
  "context"

  corev1 "k8s.io/api/core/v1"
  ctrl "sigs.k8s.io/controller-runtime"
  "sigs.k8s.io/controller-runtime/pkg/client"
  "sigs.k8s.io/controller-runtime/pkg/handler"
  "sigs.k8s.io/controller-runtime/pkg/reconcile"
  "k8s.io/apimachinery/pkg/types"
)
// SetupWithManager sets up the controller with the Manager.
func (r *PodReconciler) SetupWithManager(mgr ctrl.Manager) error {
  return ctrl.NewControllerManagedBy(mgr).
    // highlight-start
    Watches(
      &corev1.Pod{},
      handler.EnqueueRequestsFromMapFunc(r.findObjectsForPod),
    ).
    // highlight-end
    Named("pod").
    Complete(r)
}

// 过滤带有 example-annotation 注解的 Pod
func (r *PodReconciler) findObjectsForPod(ctx context.Context, pod client.Object) []reconcile.Request {
  if pod.GetAnnotations()["example-annotation"] == "" {
    return []reconcile.Request{}
  }
  return []reconcile.Request{
    {
      NamespacedName: types.NamespacedName{
        Name:      pod.GetName(),
        Namespace: pod.GetNamespace(),
      },
    },
  }
}

```

## 跨 Controller 通知重新 Reconcile

场景：在一个 Controller 中需通知另一个 Controller 对某个资源重新 Reconcile。
场景示例：假如某个 CRD 的资源始终关联有同名的 Pod，且 CR 均有 Pod Controller 自动创建，CR 也会随着 Pod 删除而被自动清理。当 CR 被删除时，CRD 对应的 Controller 执行了清理逻辑并移除 Finalizer，但此时 Pod 可能存在，通常是手动删除 CR 的场景，此时需让 Pod Controller 重新入队改资源，以便让 CR 被再次自动创建出来。

实现思路（以场景示例中所说的 CRD + Pod 为例）：
1. 通过修改 Pod 资源触发 Reconcile。比如设置一个 last-update-time 的注解，将当前时间戳写上去，触发 Pod Controller 重新 Reconcile）。
2. 通过 channel 通知 Reconcile。在 `PodReconciler` 的 `SetupWithManager` 中，调用 `WatchesRawSource` 并传入共享的 channel 对象，CRD 对应的 Controller 向该 channel 发送通知来触发 Pod 重新 Reconcile。

最佳实践当然是思路二，无需引入额外的注解写入操作。

具体方法是在 `pod_controller.go` 中定义接受通知的 channel:

```go
var podEventSource = make(chan event.TypedGenericEvent[client.Object])
```

然后在 `SetupWithManager` 中传入该 channel:

```go showLineNumbers
func (r *PodReconciler) SetupWithManager(mgr ctrl.Manager) error {
  return ctrl.NewControllerManagedBy(mgr).
    Watches(
      &corev1.Pod{},
      handler.EnqueueRequestsFromMapFunc(r.findObjectsForPod),
    ).
    // highlight-next-line
    WatchesRawSource(source.Channel(podEventSource, &handler.EnqueueRequestForObject{})).
    Named("pod").
    Complete(r)
}
```

最后在其它 Controller 中需要通知 Pod 重新 Reconcile 的地方往 channel 里写入要 Reconcile 的 Pod 即可：

```go
podEventSource <- event.TypedGenericEvent[client.Object]{
  Object: pod,
}
```
