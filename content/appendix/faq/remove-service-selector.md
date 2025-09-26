# 移除 Service Selector 导致 Service 转发异常

## 问题复现

1. 移除 Service 的 Selector
2. 重建 Pod （触发 Pod 重新分配）
3. 把移除的 Selector 加回去
4. 多次访问 Service，可发现会有 Service 访问不通的情况

## 原因

Kubernetes 从 1.19 版本开始，kube-proxy 默认使用 EndpointSlice 作为 Service 后端的数据源来同步规则：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F26%2F20250926095724.png)

> 参考 [Feature Gates (removed)](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)

如果不删除重建 Service，直接通过修改 Service 的方式来移除 Selector，也就是从 Kubenretes 自动管理 Endpoint 切换到用户手动管理 Endpoint，Kubernetes 为了将破坏性降到最低，会认为用户希望是基于之前的 Endpoint （自动管理的 Endpiont）基础上进行改动，并不会删除之前的 Endpoint（自动管理的 Endpoint 会存储在 EndpointSlice 对象中，当移除 selector 后，EndpointSlice 对象并不会被删除），当 Selector 又被加回来时，会创建新的 EndpointSlice 对象，此时旧的和新的 EndpointSlice 对象会同时存在，而旧的 EndpiontSlice 中的 IP 可能已经失效，但 kube-proxy 的数据源以  EndpointSlice 为准来同步 Service 的转发后端，当转发到失效的 IP 时就会不通。

相关 issue: 
1. [Should update endpoints when delete service selector](https://github.com/kubernetes/kubernetes/issues/103576)
2. [EndpointSlice object is not removed when service selector is made to be empty](https://github.com/kubernetes/kubernetes/issues/118376)


## 最佳实践

1. 如果是希望让现有的 Service 从自动管理 Endpoint 切换到完全以手动定义的 Endpoint 的 IP 列表为准，建议通过重建 Service 来实现完成切换，不要基于已有的 Service 移除 Selector 的方式来实现。
2. 如果 Endpoint 是从自动管理切换到手动管理，然后又切回自动管理，建议将之前残留的 EndpointSlice 对象删除，避免出现 Service 访问不通的情况。
