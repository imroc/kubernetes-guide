# 排查 Pod 一直 Pending

Pod 一直 Pending 一般是调度失败，通常我们可以通过 describe 来看下 event 来判断 pending 原因:

``` bash
$ kubectl describe pod tikv-0
...
Events:
  Type     Reason            Age                 From               Message
  ----     ------            ----                ----               -------
  Warning  FailedScheduling  3m (x106 over 33m)  default-scheduler  0/4 nodes are available: 1 node(s) had no available volume zone, 2 Insufficient cpu, 3 Insufficient memory.
```

## 任何节点中都没有足够的资源来分配 pod

Kubernetes 会根据 Pod 的 Request 和所有节点的资源已分配与可分配的情况 (CPU, Memory, GPU, MaxPod 等) 来决定哪些节点可以被调度，如果所有节点都没有足够资源了，Pod 就会一直保持 Pending。

如果判断某个 Node 资源是否足够？ 通过 `kubectl describe node <node-name>` 查看 node 资源情况，关注以下信息：

* `Allocatable`: 表示此节点能够申请的资源总和
* `Allocated resources`: 表示此节点已分配的资源 (Allocatable 减去节点上所有 Pod 总的 Request)

前者与后者相减，可得出剩余可申请的资源。如果这个值小于 Pod 的 request，就不满足 Pod 的资源要求，Scheduler 在 Predicates (预选) 阶段就会剔除掉这个 Node，也就不会调度上去。

## 不满足亲和性

如果 Pod 包含 nodeSelector 指定了节点需要包含的 label，调度器将只会考虑将 Pod 调度到包含这些 label 的 Node 上，如果没有 Node 有这些 label 或者有这些 label 的 Node 其它条件不满足也将会无法调度。参考官方文档：https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector

如果 Pod 包含 affinity（亲和性）的配置，调度器根据调度算法也可能算出没有满足条件的 Node，从而无法调度。affinity 有以下几类:

* nodeAffinity: 节点亲和性，可以看成是增强版的 nodeSelector，用于限制 Pod 只允许被调度到某一部分 Node。
* podAffinity: Pod 亲和性，用于将一些有关联的 Pod 调度到同一个地方，同一个地方可以是指同一个节点或同一个可用区的节点等。
* podAntiAffinity: Pod 反亲和性，用于避免将某一类 Pod 调度到同一个地方避免单点故障，比如将集群 DNS 服务的 Pod 副本都调度到不同节点，避免一个节点挂了造成整个集群 DNS 解析失败，使得业务中断。

## 节点不可调度

由于节点压力(NotReady)或人为行为（节点封锁），节点可能会变为不可调度的状态，这些节点在状态发生变化之前不会调度任何 pod。

可以通过 `kubectl get node` 查看节点是否是 `NotReady` 或 `SchedulingDisabled`。

## 挂载磁盘或固定 IP 导致无法漂移

如果 Pod 挂载了磁盘(块存储)，而一般云盘的实现是不能跨可用区的(时延太高)，如果集群中节点分布在多个可用区，当前可用区节点无资源可调度时，Pod 也无法漂移到其它可用区。

Pod 报类似如下事件日志:

```txt
0/4 nodes are available: 2 node(s) insufficient memory, 2 node(s) had no available volume zone.
```

解决方法：要么删除 pvc 并重建 pod，自动在被调度到的可用区里创建磁盘并挂载；要么在 pod 之前所在可用区内扩容节点以补充资源。

同理，如果固定了 IP(通过插件或云厂商的网络实现)，通常 Pod 就不能漂移到其它子网的节点上去。

解决方法: 加节点，或取消固定 IP 然后重建。

## 污点与容忍

节点如果被打上了污点，Pod 必须要容忍污点才能调度上去:

```bash
0/5 nodes are available: 3 node(s) had taints that the pod didn't tolerate, 2 Insufficient memory.
```

通过 describe node 可以看下 Node 有哪些 Taints:

``` bash
$ kubectl describe nodes host1
...
Taints:             special=true:NoSchedule
...
```

如果希望 Pod 可以调度上去，通常解决方法有两个:

1. 删除污点:

``` bash
kubectl taint nodes host1 special-
```

2. 给 Pod 加上这个污点的容忍:

``` yaml
tolerations:
- key: "special"
  operator: "Equal"
  value: "true"
  effect: "NoSchedule"
```

我们通常使用后者的方法来解决。污点既可以是手动添加也可以是被自动添加，下面来深入分析一下。

### 手动添加的污点

通过类似以下方式可以给节点添加污点:

``` bash
$ kubectl taint node host1 special=true:NoSchedule
node "host1" tainted
```

另外，有些场景下希望新加的节点默认不调度 Pod，直到调整完节点上某些配置才允许调度，就给新加的节点都加上 `node.kubernetes.io/unschedulable` 这个污点。

### 自动添加的污点

如果节点运行状态不正常，污点也可以被自动添加，从 v1.12 开始，`TaintNodesByCondition` 特性进入 Beta 默认开启，controller manager 会检查 Node 的 Condition，如果命中条件就自动为 Node 加上相应的污点，这些 Condition 与 Taints 的对应关系如下:

``` txt
Conditon               Value       Taints
--------               -----       ------
OutOfDisk              True        node.kubernetes.io/out-of-disk
Ready                  False       node.kubernetes.io/not-ready
Ready                  Unknown     node.kubernetes.io/unreachable
MemoryPressure         True        node.kubernetes.io/memory-pressure
PIDPressure            True        node.kubernetes.io/pid-pressure
DiskPressure           True        node.kubernetes.io/disk-pressure
NetworkUnavailable     True        node.kubernetes.io/network-unavailable
```

解释下上面各种条件的意思:

* OutOfDisk 为 True 表示节点磁盘空间不够了
* Ready 为 False 表示节点不健康
* Ready 为 Unknown 表示节点失联，在 `node-monitor-grace-period` 这么长的时间内没有上报状态 controller-manager 就会将 Node 状态置为 Unknown (默认 40s)
* MemoryPressure 为 True 表示节点内存压力大，实际可用内存很少
* PIDPressure 为 True 表示节点上运行了太多进程，PID 数量不够用了
* DiskPressure 为 True 表示节点上的磁盘可用空间太少了
* NetworkUnavailable 为 True 表示节点上的网络没有正确配置，无法跟其它 Pod 正常通信

另外，在云环境下，比如腾讯云 TKE，添加新节点会先给这个 Node 加上 `node.cloudprovider.kubernetes.io/uninitialized` 的污点，等 Node 初始化成功后才自动移除这个污点，避免 Pod 被调度到没初始化好的 Node 上。

## kube-scheduler 没有正常运行

检查 maser 上的 `kube-scheduler` 是否运行正常，异常的话可以尝试重启临时恢复。

## 参考资料

* [Understanding Kubernetes pod pending problems](https://sysdig.com/blog/kubernetes-pod-pending-problems/)
* [彻底搞懂 K8S Pod Pending 故障原因及解决方案 ](https://mp.weixin.qq.com/s/SBpnxLfMq4Ubsvg5WH89lA)