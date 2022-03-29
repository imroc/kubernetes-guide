# 基于 iphash 进行负载均衡

## 场景

根据源 IP 进行负载均衡，在 istio 中如何配置呢 ？

## 用法

配置 `DestinationRule`，指定 `useSourceIp` 负载均衡策略:


```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: bookinfo-ratings
spec:
  host: ratings.prod.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        useSourceIp: true
```

## 参考资料

* 官方参考文档: [LoadBalancerSettings.ConsistentHashLB](https://istio.io/latest/docs/reference/config/networking/destination-rule/#LoadBalancerSettings-ConsistentHashLB)
