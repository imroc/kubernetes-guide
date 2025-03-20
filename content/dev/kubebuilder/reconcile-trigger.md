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

```go
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
    Watches(
      &corev1.Pod{},
      handler.EnqueueRequestsFromMapFunc(r.findObjectsForPod),
    ).
    Named("pod").
    Complete(r)
}

// 过滤带有 networking.cloud.tencent.com/enable-clb-port-mapping 注解的 Pod
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
