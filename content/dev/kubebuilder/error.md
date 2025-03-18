# 错误处理

当 Controller 的 Reconcile 函数返回 error 时，Controller 会打印错误日志并重新入队再次调谐。

## 资源冲突错误只重新入队不打印错误

在修改资源时可能会遇到资源修改冲突 error，即当前缓存的 ResourceVersion 与服务器端的 ResourceVersion 不一致。如果将 error 直接透传返回给 Reconcile 函数的返回值，将会打印冲突日志并重新入队，但资源冲突的错误很常见，一般不需要关注，直接让它重新入队即可：

```go showLineNumbers
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	pod := &corev1.Pod{}
	if err := r.Get(ctx, req.NamespacedName, pod); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
  if err := r.syncPod(ctx, pod); err != nil {
    // highlight-start
    if apierrors.IsConflict(err) {
      return ctrl.Result{Requeue: true}, nil
    }
    // highlight-end
    return ctrl.Result{}, err
  }
  return ctrl.Result{}, nil
}

func (r *PodReconciler) syncPod(ctx context.Context, pod *corev1.Pod) error {
  // ...
}
```
