# Pod 打散调度

将 Pod 打散调度到不同地方，可避免因软硬件故障、光纤故障、断电或自然灾害等因素导致服务不可用，以实现服务的高可用部署。

Kubernetes 支持两种方式将 Pod 打散调度:
* Pod 反亲和 (Pod Anti-Affinity)
* Pod 拓扑分布约束 (Pod Topology Spread Constraints)

本文介绍两种方式的用法示例与对比总结。

## 使用 podAntiAffinity

**将 Pod 强制打散调度到不同节点上(强反亲和)，以避免单点故障**:

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
      labels:
        app: nginx
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: nginx
      containers:
      - name: nginx
        image: nginx
```

* `labelSelector.matchLabels` 替换成选中 Pod 实际使用的 label。
* `topologyKey`: 节点的某个 label 的 key，能代表节点所处拓扑域，可以用 [Well-Known Labels](https://kubernetes.io/docs/reference/labels-annotations-taints/#failure-domainbetakubernetesioregion)，常用的是 `kubernetes.io/hostname` (节点维度)、`topology.kubernetes.io/zone` (可用区/机房 维度)。也可以自行手动为节点打上自定义的 label 来定义拓扑域，比如 `rack` (机架维度)、`machine` (物理机维度)、`switch` (交换机维度)。
* 若不希望用强制，可以使用弱反亲和，让 Pod 尽量调度到不同节点:
  ```yaml
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - podAffinityTerm:
        topologyKey: kubernetes.io/hostname
      weight: 100
  ```

**将 Pod 强制打散调度到不同可用区(机房)，以实现跨机房容灾**:

将 `kubernetes.io/hostname` 换成 `topology.kubernetes.io/zone`，其余同上。

## 使用 topologySpreadConstraints

**将 Pod 最大程度上均匀的打散调度到各个节点上**:

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
      labels:
        app: nginx
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
        - matchLabels:
            app: nginx
      containers:
      - name: nginx
        image: nginx
```

* `topologyKey`: 与 podAntiAffinity 中配置类似。
* `labelSelector`: 与 podAntiAffinity 中配置类似，只是这里可以支持选中多组 pod 的 label。
* `maxSkew`: 必须是大于零的整数，表示能容忍不同拓扑域中 Pod 数量差异的最大值。这里的 1 意味着只允许相差 1 个 Pod。
* `whenUnsatisfiable`: 指示不满足条件时如何处理。`DoNotSchedule` 不调度 (保持 Pending)，类似强反亲和；`ScheduleAnyway` 表示要调度，类似弱反亲和；

以上配置连起来解释: 将所有 nginx 的 Pod 严格均匀打散调度到不同节点上，不同节点上 nginx 的副本数量最多只能相差 1 个，如果有节点因其它因素无法调度更多的 Pod (比如资源不足)，那么就让剩余的 nginx 副本 Pending。

所以，如果要在所有节点中严格打散，通常不太可取，可以加下 nodeAffinity，只在部分资源充足的节点严格打散:

```yaml
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: io
                operator: In
                values:
                - high
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
        - matchLabels:
            app: nginx
```

或者类似弱反亲和， **将 Pod 尽量均匀的打散调度到各个节点上，不强制** (DoNotSchedule 改为 ScheduleAnyway):

```yaml
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
        - matchLabels:
            app: nginx
```

如果集群节点支持跨可用区，也可以 **将 Pod 尽量均匀的打散调度到各个可用区** 以实现更高级别的高可用 (topologyKey 改为 `topology.kubernetes.io/zone`):

```yaml
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
        - matchLabels:
            app: nginx
```

更进一步地，可以 **将 Pod 尽量均匀的打散调度到各个可用区的同时，在可用区内部各节点也尽量打散**:

```yaml
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
        - matchLabels:
            app: nginx
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
        - matchLabels:
            app: nginx
```

## 小结

从示例能明显看出，`topologySpreadConstraints` 比 `podAntiAffinity` 功能更强，提供了提供更精细的调度控制，我们可以理解成 `topologySpreadConstraints` 是 `podAntiAffinity` 的升级版。`topologySpreadConstraints` 特性在 K8S v1.18 默认启用，所以建议 v1.18 及其以上的集群使用 `topologySpreadConstraints` 来打散 Pod 的分布以提高服务可用性。

## 参考资料

* [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/)