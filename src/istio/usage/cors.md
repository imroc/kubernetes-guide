# 使用 corsPolicy 解决跨域问题

通常解决跨域问题都是在 web 框架中进行配置，使用 istio 后我们可以将其交给 istio 处理，业务不需要关心。本文介绍如何利用 Istio 配置来对 HTTP 服务启用跨域支持。

## 配置方法

Istio 中通过配置 VirtualService 的 corsPolicy 可以实现跨域支持，示例:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: nginx
  namespace: istio-demo
spec:
  gateways:
  - istio-demo/nginx-gw
  hosts:
  - 'nginx.example.com'
  - 'test.example.com'
  http:
  - corsPolicy:
      allowOrigins:
      - regex: "https?://nginx.example.com|https?://test.example.com"
    route:
    - destination:
        host: nginx.istio-demo.svc.cluster.local
        port:
          number: 80
```

* 关键配置在于 `allowOrigins`，表示允许带哪些 Origin 地址的请求。
* 若有多个域名，使用 `regex` 匹配，`|` 符号分隔。
* 若同时支持 http 和 https，`regex` 中的地址在 `http` 后面加 `s?`，表示匹配 `http` 或 `https`，即两种协议同时支持。
* 关于 `corsPolicy` 更多配置，参考 [Istio CorsPolicy 官方文档](https://istio.io/latest/docs/reference/config/networking/virtual-service/#CorsPolicy) 。

## 一些误区

有同学测试发现，当请求带上了错误的 `Origin` 或没带 `Origin` 时，响应内容也正常返回了:
```bash
$ curl -I -H 'Origin: http://fake.example.com' 1.1.1.1:80
HTTP/1.1 200 OK
...
```

为什么能正常返回呢？corsPolicy 没生效吗？有这样疑问的同学可能对 [CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS) 理解不太到位。

控制请求能否跨域的逻辑核心在于浏览器，浏览器通过判断请求响应的 [access-control-allow-origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin) header 中是否有当前页面的地址，来判断该跨域请求能否被允许。所以业务要对跨域支持的关键点在于对 `access-control-allow-origin` 这个头的支持，通常一些 web 框架支持跨域也主要是干这个，为响应自动加上 `access-control-allow-origin` 响应头，istio 也不例外。

所以这里请求一般都能正常返回，只是如果跨域校验失败的话不会响应 `access-control-allow-origin` 这个 header 以告知浏览器该请求不能跨域，但响应的 body 是正常的，不会做修改。