# 利用 Prism 构造多版本测试服务

## 概述

[Prism](https://github.com/stoplightio/prism) 是一个支持 http mock 的开源工具，可以解析 openapi 配置，根据配置进行相应的响应，我们可以利用它来实现部署多版本服务，用于测试 istio 多版本服务相关的功能。本文给出一个简单的示例。

## 准备 OpenAPI 配置

我们将 OpenAPI 配置文件存到 ConfigMap 中，用于后续挂载到 prism 作为配置文件 (`prism-conf.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prism-conf
data:
  mock-v1.yaml: |
    openapi: 3.0.3
    info:
      title: MockServer v2
      description: MockServer v2
      version: 1.0.0
    paths:
      '/':
        get:
          responses:
            '200':
              content:
                'text/plain':
                  schema:
                    type: string
                    example: v1
  mock-v2.yaml: |
    openapi: 3.0.3
    info:
      title: MockServer v2
      description: MockServer v2
      version: 1.0.0
    paths:
      '/':
        get:
          responses:
            '200':
              content:
                'text/plain':
                  schema:
                    type: string
                    example: v2
```

这里的配置很简单，两个 OpenAPI 配置文件，`GET` 方式请求 `/` 路径分别响应 `v1` 和 `v2` 的字符串，以便从响应中就能区分出请求转发到了哪个版本的服务。

如果想用编辑器或 IDE 的 OpenAPI 插件编辑配置文件来定义更复杂的规则，可以先直接创建原生 OpenAPI 配置文件 (如 `mock-v1.yaml` 和 `mock-v2.yaml`)，然后使用类似下面的命令生成 configmap 的 yaml:

```bash
kubectl create configmap prism-conf --dry-run=client -o yaml
  --from-file=mock-v1.yaml \
  --from-file=mock-v2.yaml | \
  grep -v creationTimestamp > prism-conf.yaml
```

## 部署多版本服务

使用 Deployment 部署两个版本的 prism (注意开启下 sidecar 自动注入)，分别挂载不同的 OpenAPI 配置，首先部署第一个版本 (`mockserver-v1.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mockserver-v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mockserver
      version: v1
  template:
    metadata:
      labels:
        app: mockserver
        version: v1
    spec:
      containers:
      - name: mockserver
        image: cr.imroc.cc/library/prism:4
        args:
        - mock
        - -h
        - 0.0.0.0
        - -p
        - "80"
        - /etc/prism/mock-v1.yaml
        volumeMounts:
        - mountPath: /etc/prism
          name: config
      volumes:
      - name: config
        configMap:
          name: prism-conf
```

再部署第二个版本 (`mockserver-v2.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mockserver-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mockserver
      version: v2
  template:
    metadata:
      labels:
        app: mockserver
        version: v2
    spec:
      containers:
      - name: mockserver
        image: cr.imroc.cc/library/prism:4
        args:
        - mock
        - -h
        - 0.0.0.0
        - -p
        - "80"
        - /etc/prism/mock-v2.yaml
        volumeMounts:
        - mountPath: /etc/prism
          name: config
      volumes:
      - name: config
        configMap:
          name: prism-conf
```

最后创建 Service (`mockserver-svc.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mockserver
  labels:
    app: mockserver
spec:
  type: ClusterIP
  ports:
  - port: 80
    protocol: TCP
    name: http
  selector:
    app: mockserver
```

## 测试访问

没有定义任何其它规则，测试访问会随机负载均衡到 v1 和 v2:

```bash
$ for i in {1..10};do curl mockserver && echo ""; done
v2
v1
v2
v1
v2
v1
v2
v1
v2
v1
```

## 使用 DestinationRule 定义多版本服务

在 DestinationRule 定义使用 pod label 来区分 v1 和 v2 版本的服务 (`mockserver-dr.yaml`):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mockserver
spec:
  host: mockserver
  subsets:
  - labels:
      app: mockserver
      version: v2
    name: v1
  - labels:
      app: mockserver
      version: v2
    name: v2
```

## 使用 VirtualService 定义多版本路由规则

这里定义一个简单的规则，v1 版本服务接收 80% 流量，v2 版本接收 20% (`mockserver-vs.yaml`):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mockserver
spec:
  hosts:
  - mockserver
  http:
  - route:
    - destination:
        host: mockserver
        port:
          number: 80
        subset: v1
      weight: 80
    - destination:
        host: mockserver
        port:
          number: 80
        subset: v2
      weight: 20
```

## 测试验证多版本流量转发规则

上面定义了 DestinationRule 和 VirtualService 之后，会根据定义的规则进行转发:

```bash
$ for i in {1..10};do curl mockserver && echo ""; done
v1
v2
v1
v1
v2
v1
v1
v1
v1
v1
```