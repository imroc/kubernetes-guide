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