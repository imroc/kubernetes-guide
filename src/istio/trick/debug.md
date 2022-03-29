# 调试技巧

## 测试与 istiod 的连通性

测试数据面是否能连上 xDS 端口:

```bash
nc -vz istiod-1-8-1.istio-system 15012
```

测试 istiod 监控接口:

```bash
$ kubectl -n debug exec debug-6fd7477c9d-brqmq -c istio-proxy -- curl -sS istiod-1-8-1.istio-system:15014/debug/endpointz
[

{"svc": "cert-manager-webhook-dnspod.cert-manager.svc.cluster.local:https", "ep": [
{
    "service": {
      "Attributes": {
        "ServiceRegistry": "Kubernetes",
        "Name": "cert-manager-webhook-dnspod",
        "Namespace": "cert-manager",
        "Labels": {
```
> 没报错，正常返回 json 说明数据面能正常连接控制面


## 配置 accesslog

配置方法参考 [这里](https://imroc.cc/istio/usage/accesslogs/) 。

## 调整 proxy 日志级别

配置方法参考 [这里](https://imroc.cc/istio/trick/customize-proxy-loglevel/) 。

## 获取 metrics

```bash
kubectl -n test exec -c istio-proxy htmall-6657db8f8f-l74qm -- curl -sS localhost:15090/stats/prometheus
```