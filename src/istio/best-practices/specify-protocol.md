# 为服务显式指定协议

## 背景

istio 需要知道服务提供什么七层协议，从而来为其配置相应协议的 filter chain，通常最好是显式声明协议，如果没有声明，istio 会自动探测，这个探测能力比较有限，有些时候可能会匹配协议错误(比如使用非标端口)，导致无法正常工作。

本文将列出显示声明协议的方法。

## 集群内: 指定 Service 端口的协议

给集群内 Service 指定 port name 时加上相应的前缀或指定 `appProtocol` 字段可以显示声明协议，如:

```yaml
kind: Service
metadata:
  name: myservice
spec:
  ports:
  - number: 8080
    name: rpc
    appProtocol: grpc # 指定该端口提供 grpc 协议的服务
  - number: 80
    name: http-web # 指定该端口提供 http 协议的服务
```

更多详细信息请参考 [Explicit protocol selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/#explicit-protocol-selection) 。

## 集群外: 手动创建 Service + Endpoint

如果服务在集群外部 (比如 mysql)，我们可以为其手动创建一组 Service + Endpoint，且 Service 端口指定协议(跟上面一样)，这样就可以在集群内通过 Service 访问外部服务，且正确识别协议。示例:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  ports:
  - port: 4000
    name: mysql
    protocol: TCP
    
---
apiVersion: v1
kind: Endpoints
metadata:
  name: mysql
  namespace: default
subsets:
- addresses:
  - ip: 190.64.31.232 # 替换外部服务的 IP 地址
  ports:
  - port: 4000
    name: mysql
    protocol: TCP
```

创建好之后就可以通过 svc 去访问外部服务了，本例中服务地址为: `mysql.default.svc.cluster.local:4000`。

## 集群外: 使用 ServiceEntry 指定协议

如果外部服务可以被 DNS 解析，可以定义 ServiceEntry 来指定协议:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-mysql
spec:
  hosts:
  - mysql.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 4000
    name: mysql
    protocol: mysql
  resolution: DNS
```

创建好之后就可以通过域名去访问外部服务了，本例中服务地址为: `mysql.example.com:4000`。