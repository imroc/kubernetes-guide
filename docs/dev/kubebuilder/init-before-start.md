# 在 Controller 启动前对依赖进行初始化

## 场景

某些 Controller 在启动前需要进行一些初始化操作，比如根据存储在 CR 中的信息来初始化内部的缓存，作为 Controller 调谐时的依赖项。

:::tip[备注]

比如针对负载均衡器的端口分配器，内部缓存需记录各个负载均衡器及其已分配的端口信息，Controller 在调谐时检查到还未为其分配端口，就从缓存中拿到负载均衡器及其端口信息，计算出下一个可用端口并执行分配操作，最后 Controller 将已分配信息记录到 status 中。

:::

## 实现方法

核心是在调用 Controller 的 SetupWithManager 之前调用 Manager 的 Add 方法，传入 Runable 对象，会保证其在 cache 准备就行之后，Controller 启动之前执行。

```go
if err := mgr.Add(&initCache{mgr.GetClient()}); err != nil {
  setupLog.Error(err, "problem add init cache")
  os.Exit(1)
}
```

该对象实现 Runnable 接口（Start 函数），如果是多副本选主的 Controller，也实现下 LeaderElectionRunnable 接口（NeedLeaderElection 函数），确保成为 leader 后才执行：

```go
type initCache struct {
  client.Client
}

func (i *initCache) NeedLeaderElection() bool {
  return true
}

func (i *initCache) Start(ctx context.Context) error {
  setupLog.Info("starting init cache")
  defer setupLog.Info("end init cache")

  // 初始化端口池
  ppl := &networkingv1alpha1.CLBPortPoolList{}
  if err := i.List(ctx, ppl); err != nil {
    return err
  }
  for _, pp := range ppl.Items {
    if err := portpool.Allocator.AddPool(pp.Name, pp.Spec.StartPort, pp.Spec.EndPort, pp.Spec.SegmentLength); err != nil {
      return err
    }
  }

  // 初始化已分配的端口信息
  pbl := &networkingv1alpha1.CLBPodBindingList{}
  if err := i.List(ctx, pbl); err != nil {
    return err
  }
  for _, pb := range pbl.Items {
    for _, podBinding := range pb.Status.PortBindings {
      if err := portpool.Allocator.MarkAllocated(podBinding.Pool, podBinding.Port, podBinding.Protocol); err != nil {
        return err
      }
    }
  }
  return nil
}
```
