# 基于 Pod 和 Service 注解的服务发现

## 背景

很多应用会为 Pod 或 Service 打上一些注解用于 Prometheus 的服务发现，如 `prometheus.io/scrape: "true"`，这种注解并不是 Prometheus 官方支持的，而是社区的习惯性用法，要使这种注解生效，还需结合 Prometheus 的采集配置，本文介绍具体的配置方法。

## 真实案例

### istio 指标采集

[istio](https://istio.io/) 使用了这种 Pod 注解，当 Pod 被自动注入 sidecar 的同时也会被自动注入以下注解：

```yaml
    prometheus.io/path: /stats/prometheus
    prometheus.io/port: "15020"
    prometheus.io/scrape: "true"
```

表示声明让 Prometheus 采集 Envoy Sidecar 暴露的 metrics，端口是 15020，路径是 `/stats/prometheus`。

除此之外，控制面组件 istiod 的 Pod 也会有类似注解：

```yaml
    prometheus.io/port: "15014"
    prometheus.io/scrape: "true"
```

### Kubernetes Addon 指标采集

Kubenretes 源码仓库中的一些 addon 组件也使用了这种注解，有的是 Pod 注解，有的是 Service 注解。
* [coredns](https://github.com/kubernetes/kubernetes/blob/release-1.30/cluster/addons/dns/coredns/coredns.yaml.base#L196-L197) 使用 Service 注解：
  ```yaml showLineNumbers
  apiVersion: v1
  kind: Service
  metadata:
    name: kube-dns
    namespace: kube-system
    annotations:
      # highlight-start
      prometheus.io/port: "9153"
      prometheus.io/scrape: "true"  
      # highlight-end
  ```
* [nodelocaldns](https://github.com/kubernetes/kubernetes/blob/release-1.30/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml#L125-L126) 使用 Pod 注解：
  ```yaml showLineNumbers
  apiVersion: apps/v1
  kind: DaemonSet
  metadata:
    name: node-local-dns
    namespace: kube-system
    labels:
      k8s-app: node-local-dns
      kubernetes.io/cluster-service: "true"
      addonmanager.kubernetes.io/mode: Reconcile
  spec:
    updateStrategy:
      rollingUpdate:
        maxUnavailable: 10%
    selector:
      matchLabels:
        k8s-app: node-local-dns
    template:
      metadata:
        labels:
          k8s-app: node-local-dns
        annotations:
          # highlight-start
          prometheus.io/port: "9253"
          prometheus.io/scrape: "true"
          # highlight-end
  ```

## Prometheus 采集配置

### 根据 Pod 注解动态采集

<FileBlock file="prometheus/kubernetes-pods.yaml" />

### 根据 Service 注解动态采集

<FileBlock file="prometheus/kubernetes-service-endpoints.yaml" />
