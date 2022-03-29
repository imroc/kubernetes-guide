# istio 性能优化

## istiod 负载均衡

envoy 定时重连。

## istiod HPA

istiod 无状态，可水平扩展。

## xDS 按需下发

* lazy loading
* [Delta xDS](https://docs.google.com/document/d/1hwC81_jS8qARBDcDE6VTxx6fA31In96xAZWqfwnKhpQ/edit#heading=h.xw1gqgyqs5b)

## batch 推送间隔优化

istiod推送流控规则有合并推送策略，目前这个时间间隔默认值为100ms。可配，一般很少用户会关心这个，在 mesh 全局配置中可以改: PILOT_DEBOUNCE_AFTER 和 PILOT_DEBOUNCE_MAX。  主要取决于：用户期望流控规则更新的实时性，以及 istiod 稳定性的权衡，如果期望实时性高，则把防抖动时间设置短些，如果mesh规模大，希望istiod提高稳定性，则把防抖动时间设置长些。


## 关闭不必要的遥测

TODO

## 关闭 mtls

如果认为集群内是安全的，可以关掉 mtls 以提升性能

## istio 版本

* istio 1.8: 资源消耗上，envoy 大概有 30% 的降低

## 限制 namespace 以减少 sidecar 资源占用

istio 默认会下发 mesh 内集群服务所有可能需要的信息，以便让 sidecar 能够与任意 workload 通信。当集群规模较大，服务数量多，namespace 多，可能就会导致 sidecar 占用资源很高 (比如十倍于业务容器)。

如果只有部分 namespace 使用了 istio (sidecar 自动注入)，而网格中的服务与其它没有注入 sidecar 的 namespace 的服务没有多大关系，可以配置下 istio 的 `Sidecar` 资源，限制一下 namespace，避免 sidecar 加载大量无用 outbound 的规则。

**配置方法**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
  - hosts:
    - "prod/*"
    - "test/*"
```

* 定义在 istio-system 命名空间下表示 Sidecar 配置针对所有 namespace 生效。
* 在 egress 的 hosts 配置中加入开启了 sidecar 自动注入的 namespace，表示只下发这些跟这些 namespace 相关的 outbound 规则。

> 参考 [Istio Sidecar 官方文档](https://istio.io/latest/docs/reference/config/networking/sidecar/)