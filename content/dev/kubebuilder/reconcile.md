# Reconcile 最佳实践

## 概述

开发 Controller 的逻辑就是实现 Reconcile 函数，本文将介绍实现 Reconcile 的最佳实践。

当 Controller 的 Reconcile 函数返回 error 时，Controller 会打印错误日志并重新入队再次调谐。

## 创建 Controller 代码脚手架

执行 `kubebuilder create api` 时将 `--controller` 置为 true 即可创建 Controller 代码脚手架:

```bash
kubebuilder create api --group core --kind Pod --version v1 --controller=true --resource=false
```

## 处理 NotFound 和 Conflict 错误

以下情况的 error 可特殊处理：
1. 当需要调谐的对象不存在时可直接忽略，不必返回 error，用 `client.IgnoreNotFound(err)` 来包一下 error 即可。
2. 在修改资源时遇到资源修改冲突 error，即当前缓存的 ResourceVersion 与服务器端的 ResourceVersion 不一致。如果将 error 直接透传返回给 Reconcile 函数的返回值，将会打印冲突日志并重新入队，但资源冲突的错误很常见，一般不需要关注，可以不用打印出来，直接让它重新入队即可（用 `apierrors.IsConflict(err)` 判断是否为资源冲突 error，`ctrl.Result` 的 `Requeue` 置为 true 来重新入队 ）。

在 Controller 的逻辑中，可能会有非常多地方会对资源进行修改操作，都可能遇到修改冲突 error，为了统一处理此类 error，可提取 `sync` 函数来对资源进行调谐。

以 Pod Controller 为例，其 Reconcile 函数最佳实践如下：

```go showLineNumbers
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	pod := &corev1.Pod{}
	if err := r.Get(ctx, req.NamespacedName, pod); err != nil {
    // highlight-start
		return ctrl.Result{}, client.IgnoreNotFound(err)
    // highlight-end
	}
  if err := r.sync(ctx, pod); err != nil {
    // highlight-start
    if apierrors.IsConflict(err) {
      return ctrl.Result{Requeue: true}, nil
    }
    // highlight-end
    return ctrl.Result{}, err
  }
  return ctrl.Result{}, nil
}

// 同步函数
func (r *PodReconciler) sync(ctx context.Context, pod *corev1.Pod) error {
  // ...
}
```

## 提取泛型工具函数

每个 Controller 都写这样类似的代码，是不是有点重复？可以考虑再提取一个公共的泛型函数(假设提取到 controllers 包下)：

```go showLineNumbers
package controllers

import (
	"context"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func Reconcile[T client.Object](ctx context.Context, req ctrl.Request, apiClient client.Client, obj T, sync func(ctx context.Context, obj T) error) (ctrl.Result, error) {
	if err := apiClient.Get(ctx, req.NamespacedName, obj); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if err := sync(ctx, obj); err != nil {
		if apierrors.IsConflict(err) {
			return ctrl.Result{Requeue: true}, nil
		}
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}
```

然后每个 Controller 可以简化成这样：

```go showLineNumbers
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	return controllers.Reconcile(ctx, req, r.Client, &corev1.Pod{}, r.sync)
}
// 同步函数
func (r *PodReconciler) sync(ctx context.Context, pod *corev1.Pod) error {
  // ...
}
```

## 泛型函数支持统一处理 Finalizer

很多时候 Controller 也会对其管理的资源添加 Finalizer 以便在资源被删除时做一些清理工作，我们还可以再增加一个工具函数 `ReconcileWithFinalizer`，它会自动添加、移除 Finalizer，给它传入清理函数，在资源被删除时会调用它：

```go
func ReconcileWithFinalizer[T client.Object](ctx context.Context, req ctrl.Request, apiClient client.Client, obj T, finalizer string, syncFunc func(ctx context.Context, obj T) error, cleanFunc func(ctx context.Context, obj T) error) (ctrl.Result, error) {
	return Reconcile(ctx, req, apiClient, obj, func(ctx context.Context, obj T) error {
		if obj.GetDeletionTimestamp().IsZero() { // 没有删除
			// 确保 finalizer 存在，阻塞资源删除
			if !controllerutil.ContainsFinalizer(obj, finalizer) {
				controllerutil.AddFinalizer(obj, finalizer)
				if err := apiClient.Update(ctx, obj); err != nil {
					return err
				}
			}
      // 执行同步函数
			if err := syncFunc(ctx, obj); err != nil {
				return err
			}
		} else { // 正在删除
      // 执行清理函数
			if err := cleanFunc(ctx, obj); err != nil {
				return err
			}
			// 移除 finalizer，让资源最终被删除
			controllerutil.RemoveFinalizer(obj, finalizer)
			if err := apiClient.Update(ctx, obj); err != nil {
				return err
			}
		}
		return nil
	})
}
```
然后每个 Controller 可以简化成这样：

```go showLineNumbers
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	return controllers.ReconcileWithFinalizer(ctx, req, r.Client, &corev1.Pod{}, "example.com/finalizer", r.sync, r.clean)
}

// 同步函数
func (r *PodReconciler) sync(ctx context.Context, pod *corev1.Pod) error {
  // ...
}

// 清理函数
func (r *PodReconciler) clean(ctx context.Context, pod *corev1.Pod) error {
  // ...
}
```

很多时候一个 Manager 中所有 Controller 使用相同的 Finalizer 名称，这时 `ReconcileWithFinalizer` 可省去 finalizer 参数，直接用常量：

```go
func ReconcileWithFinalizer[T client.Object](ctx context.Context, req ctrl.Request, apiClient client.Client, obj T, syncFunc func(ctx context.Context, obj T) error, cleanFunc func(ctx context.Context, obj T) error) (ctrl.Result, error) {
	return Reconcile(ctx, req, apiClient, obj, func(ctx context.Context, obj T) error {
		if obj.GetDeletionTimestamp().IsZero() { // 没有删除
			// 确保 finalizer 存在，阻塞资源删除
			if !controllerutil.ContainsFinalizer(obj, constant.Finalizer) {
				controllerutil.AddFinalizer(obj, constant.Finalizer)
				if err := apiClient.Update(ctx, obj); err != nil {
					return err
				}
			}
      // 执行同步函数
			if err := syncFunc(ctx, obj); err != nil {
				return err
			}
		} else { // 正在删除
      // 执行清理函数
			if err := cleanFunc(ctx, obj); err != nil {
				return err
			}
			// 移除 finalizer，让资源最终被删除
			controllerutil.RemoveFinalizer(obj, constant.Finalizer)
			if err := apiClient.Update(ctx, obj); err != nil {
				return err
			}
		}
		return nil
	})
}
```

Controller 的 Reconcile 函数可简化成这样：

```go
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	return controllers.ReconcileWithFinalizer(ctx, req, r.Client, &corev1.Pod{}, r.sync, r.clean)
}
```
