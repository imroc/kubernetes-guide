# 原地升级

## 需求与背景

Kubernetes 默认不支持原地升级，使用腾讯云容器服务也一样，也没有集成相关插件来支持，可以安装开源的 openkruise 来实现，本文介绍如何在腾讯云容器服务上利用 openkruise 让工作负载进行原地升级。

## 原地升级的好处

原地升级的主要好处是，更新更快，并且可以避免更新后底层资源不足导致一直 Pending:

* 不需要重建 Pod，对于 EKS 来说，都不需要重建虚拟机。
* 原地升级实际就是替换容器镜像，重启下容器，对于 EKS 来说，可以避免 Pod 重建后底层没资源调度的情况。
* 不需要重新拉取整个镜像，只需要拉取有变化的 layer 即可。

## 操作步骤

### 安装 openkruise


```bash
helm repo add openkruise https://openkruise.github.io/charts/
helm repo update
helm install kruise openkruise/kruise
```

> 参考 [官方安装文档](https://openkruise.io/zh/docs/installation)

### 创建支持原地升级的工作负载

OpenKruise 中有以下几种工作负载支持原地升级:

* CloneSet
* Advanced StatefulSet
* Advanced DaemonSet
* SidecarSet

> 更多原地升级详细文档参考 [官方文档](https://openkruise.io/zh/docs/core-concepts/inplace-update/)

以下用 `Advanced StatefulSet` 进行演示，准备 `sts.yaml`

```yaml
apiVersion: apps.kruise.io/v1beta1
kind: StatefulSet
metadata:
  name: sample
spec:
  replicas: 3
  serviceName: fake-service
  selector:
    matchLabels:
      app: sample
  template:
    metadata:
      labels:
        app: sample
    spec:
      readinessGates:
      # A new condition that ensures the pod remains at NotReady state while the in-place update is happening
      - conditionType: InPlaceUpdateReady
      containers:
      - name: main
        image: nginx:alpine
  podManagementPolicy: Parallel # allow parallel updates, works together with maxUnavailable
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Do in-place update if possible, currently only image update is supported for in-place update
      podUpdatePolicy: InPlaceIfPossible
      # Allow parallel updates with max number of unavailable instances equals to 2
      maxUnavailable: 2
```

部署到集群:

```bash
$ kubectl apply -f sts.yaml
statefulset.apps.kruise.io/sample created
```

检查 pod 是否正常拉起:

```bash
$ kubectl get pod
NAME       READY   STATUS    RESTARTS   AGE
sample-0   1/1     Running   0          16s
sample-1   1/1     Running   0          16s
sample-2   1/1     Running   0          16s
```

### 更新镜像

修改 yaml 中的 image 为 `nginx:latest`，然后再 apply:

```bash
$ kubectl apply -f sts.yaml
statefulset.apps.kruise.io/sample configured
```

观察 pod:

```bash
$ kubectl get pod
NAME       READY   STATUS    RESTARTS   AGE
sample-0   1/1     Running   1          2m47s
sample-1   1/1     Running   1          2m47s
sample-2   1/1     Running   1          2m47s
```

可以看到，pod 中的容器只是重启了下，并没重建 pod，至此，原地升级验证成功。