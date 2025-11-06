# 暴露 APIServer

## 通过 EnvoyGateway 暴露

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: apiserver
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller

--- 

apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: apiserver
  namespace: default
spec:
  gatewayClassName: apiserver
  listeners:
  - name: apiserver
    protocol: TCP
    port: 8443
    allowedRoutes:
      namespaces:
        from: All
---

apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: apiserver
  namespace: default
spec:
  parentRefs:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: apiserver
    namespace: default
    sectionName: apiserver
  rules:
  - backendRefs:
    - group: ""
      kind: Service
      name: kubernetes
      port: 443
      weight: 1

```
