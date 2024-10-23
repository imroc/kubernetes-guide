# 为 dnspod 的域名签发免费证书

如果你的域名使用 [DNSPod](https://docs.dnspod.cn/) 管理，想在 Kubernetes 上为域名自动签发免费证书，可以使用 cert-manager 来实现。

cert-manager 支持许多 dns provider，但不支持国内的 dnspod，不过 cert-manager 提供了 [Webhook](https://cert-manager.io/docs/concepts/webhook/) 机制来扩展 provider，社区也有 dnspod 的 provider 实现，但没怎么维护了。

本文将介绍如何结合 cert-manager 与本人开发的 [cert-manager-webhook-dnspod](https://github.com/imroc/cert-manager-webhook-dnspod) 来实现为 dnspod 上的域名自动签发免费证书，支持最新 cert-manager，接入腾讯云API密钥(dnspod 官方推荐方式，不用 `apiID` 和 `apiToken`)。

## 基础知识

推荐先阅读  [使用 cert-manager 签发免费证书](sign-free-certs-with-cert-manager.md) 。

## 创建腾讯云 API 密钥

登录腾讯云控制台，在 [API密钥管理](https://console.cloud.tencent.com/cam/capi) 中新建密钥，然后复制自动生成的 `SecretId` 和 `SecretKey` 并保存下来，以备后面的步骤使用。

## 安装 cert-manager-webhook-dnspod

阅读了前面推荐的文章，假设集群中已经安装了 cert-manager，下面使用 helm 来安装下 cert-manager-webhook-dnspod 。

首先准备下 helm 配置文件 (`dnspod-webhook-values.yaml`):

```yaml
clusterIssuer:
  enabled: true
  name: dnspod # 自动创建的 ClusterIssuer 名称
  ttl: 600
  staging: false
  secretId: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' # 替换成你的 SecretId
  secretKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' # 替换成你的 SecretKey
  email: roc@imroc.cc # 用于接收证书过期的邮件告警。如果cert-manager和webhook都正常工作，证书会自动续期不会过期

```

> 完整配置见 [values.yaml](https://github.com/imroc/cert-manager-webhook-dnspod/blob/master/charts/values.yaml)

然后使用 helm 进行安装:

```bash
helm repo add roc https://charts.imroc.cc
helm upgrade --install -f dnspod-webhook-values.yaml cert-manager-webhook-dnspod roc/cert-manager-webhook-dnspod -n cert-manager
```

## 创建证书

创建 `Certificate` 对象来签发免费证书:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-crt
  namespace: istio-system
spec:
  secretName: example-crt-secret # 证书保存在这个 secret 中
  issuerRef:
    name: dnspod # 这里使用自动生成出来的 ClusterIssuer
    kind: ClusterIssuer
    group: cert-manager.io
  dnsNames: # 填入需要签发证书的域名列表，支持泛域名，确保域名是使用 dnspod 管理的
  - "example.com"
  - "*.example.com"
```

等待状态变成 Ready 表示签发成功:

```bash
$ kubectl -n istio-system get certificates.cert-manager.io
NAME          READY   SECRET               AGE
example-crt   True    example-crt-secret   25d
```

若签发失败可 describe 一下看下原因:

```bash
kubectl -n istio-system describe certificates.cert-manager.io example-crt
```

## 使用证书

证书签发成功后会保存到我们指定的 secret 中，下面给出一些使用示例。

在 ingress 中使用:

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: test-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: web
          servicePort: 80
  tls:
    hosts:
    - test.example.com
    secretName: example-crt-secret # 引用证书 secret
```

在 istio 的 ingressgateway 中使用:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: example-gw
  namespace: istio-system
spec:
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: HTTP-80
      protocol: HTTP
    hosts:
    - example.com
    - "*.example.com"
    tls:
      httpsRedirect: true # http 重定向 https (强制 https)
  - port:
      number: 443
      name: HTTPS-443
      protocol: HTTPS
    hosts:
    - example.com
    - "*.example.com"
    tls:
      mode: SIMPLE
      credentialName: example-crt-secret # 引用证书 secret
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: example-vs
  namespace: test
spec:
  gateways:
  - istio-system/example-gw # 转发规则绑定到 ingressgateway，将服务暴露出去
  hosts:
  - 'test.example.com'
  http:
  - route:
    - destination:
        host: example
        port:
          number: 80
```