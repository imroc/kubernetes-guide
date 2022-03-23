# 安全维护或下线节点

有时候我们需要对节点进行维护或进行版本升级等操作，操作之前需要对节点执行驱逐 (kubectl drain)，驱逐时会将节点上的 Pod 进行删除，以便它们漂移到其它节点上，当驱逐完毕之后，节点上的 Pod 都漂移到其它节点了，这时我们就可以放心的对节点进行操作了。

## 驱逐存在的问题

有一个问题就是，驱逐节点是一种有损操作，驱逐的原理:

1. 封锁节点 (设为不可调度，避免新的 Pod 调度上来)。
2. 将该节点上的 Pod 删除。
3. ReplicaSet 控制器检测到 Pod 减少，会重新创建一个 Pod，调度到新的节点上。

这个过程是先删除，再创建，并非是滚动更新，因此更新过程中，如果一个服务的所有副本都在被驱逐的节点上，则可能导致该服务不可用。

我们再来下什么情况下驱逐会导致服务不可用:

1. 服务存在单点故障，所有副本都在同一个节点，驱逐该节点时，就可能造成服务不可用。
2. 服务没有单点故障，但刚好这个服务涉及的 Pod 全部都部署在这一批被驱逐的节点上，所以这个服务的所有 Pod 同时被删，也会造成服务不可用。
3. 服务没有单点故障，也没有全部部署到这一批被驱逐的节点上，但驱逐时造成这个服务的一部分 Pod 被删，短时间内服务的处理能力下降导致服务过载，部分请求无法处理，也就降低了服务可用性。

## 解决方案

针对第一点，我们可以使用前面讲的 [Pod 打散调度](pod-split-up-scheduling.md) 避免单点故障。

针对第二和第三点，我们可以通过配置 PDB (PodDisruptionBudget) 来避免所有副本同时被删除，驱逐时 K8S 会 "观察" nginx 的当前可用与期望的副本数，根据定义的 PDB 来控制 Pod 删除速率，达到阀值时会等待 Pod 在其它节点上启动并就绪后再继续删除，以避免同时删除太多的 Pod 导致服务不可用或可用性降低，下面给出两个示例。

示例一 (保证驱逐时 nginx 至少有 90% 的副本可用):

``` yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
spec:
  minAvailable: 90%
  selector:
    matchLabels:
      app: zookeeper
```

示例二 (保证驱逐时 zookeeper 最多有一个副本不可用，相当于逐个删除并等待在其它节点完成重建):

``` yaml
apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: zookeeper
```