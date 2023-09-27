# controller-manager 和 scheduler 状态显示 Unhealthy

## 背景

有些地方显示 TKE 集群的 controller-manager 和 scheduler 组件 Unhealthy，比如使用 `kubectl get cs` 查看:

```bash
$ kubectl get cs
NAME                 STATUS      MESSAGE                                                                                       ERROR
scheduler            Unhealthy   Get "http://127.0.0.1:10251/healthz": dial tcp 127.0.0.1:10251: connect: connection refused
controller-manager   Unhealthy   Get "http://127.0.0.1:10252/healthz": dial tcp 127.0.0.1:10252: connect: connection refused
etcd-0               Healthy     {"health":"true"}
```

或者使用 rancher 查看:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925161905.png)

## 原因

是因为 TKE 托管集群的 master 各个组件都是单独部署的，apiserver 与 controller-manager 和 scheduler 都不在同一台机器，而  controller-manager 和 scheduler 的状态，是 apiserver 来探测的，探测的代码是写死的直接连本机:

```go
func (s componentStatusStorage) serversToValidate() map[string]*componentstatus.Server {
    serversToValidate := map[string]*componentstatus.Server{
        "controller-manager": {Addr: "127.0.0.1", Port: ports.InsecureKubeControllerManagerPort, Path: "/healthz"},
        "scheduler":          {Addr: "127.0.0.1", Port: ports.InsecureSchedulerPort, Path: "/healthz"},
    }
```

这个只是显示问题，不影响使用。

## 相关链接

* 探测直连本机源码: https://github.com/kubernetes/kubernetes/blob/v1.14.3/pkg/registry/core/rest/storage_core.go#L256
* k8s issue: https://github.com/kubernetes/kubernetes/issues/19570
* rancher issue: https://github.com/rancher/rancher/issues/11496
