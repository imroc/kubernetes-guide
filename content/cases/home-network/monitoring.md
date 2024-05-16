# 监控系统：VictoriaMetrics + Grafana

## 云原生家庭网络监控系统

如何打造一个云原生家庭网络的监控系统？该如何选型？毫无疑问，在云原生领域，`Prometheus` 生态已成为监控标配，通常都会部署 `Prometheus` 来采集监控数据，配合 `Grafana` 来展示监控面板。

但是，`Prometheus` 的监控数据会占用很大的存储空间，采集数据时也会占用很大的内存，而路由器的计算资源往往都比较小，可不能像服务器那样奢侈。

好在 [VictoriaMetrics](https://docs.victoriametrics.com/quick-start) 提供了很好的解决方案，兼容 `Prometheus` 的同时，有更强的性能，占用更小的存储空间和内存，在路由器上替代 `Prometheus` 再合适不过了，所以，本文将基于 `VictoriaMetrics` 在路由器上部署监控系统。

## victoria-metrics-k8s-stack

`Prometheus` 社区提供了 [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) 这个 helm chart 来部署 `Prometheus` 及其生态内相关的产品，相应的，`VictoriaMetrics` 社区提供了对等的 chart: [victoria-metrics-k8s-stack](https://github.com/VictoriaMetrics/helm-charts/tree/master/charts/victoria-metrics-k8s-stack)。

实际上路由器上的监控需求相对监控，也可以直接自己手工写 `VictoriaMetrics` + `Grafana` 的部署 YAML，但这个不利于后续的升级，升级不单单是升级容器镜像，相应的 YAML 和应用配置都可能改动，所以如果是要打算后续持续升级，享受最新的功能，建议是用社区的 `victoria-metrics-k8s-stack` 这个 helm chart 安装。

## 使用 victoria-metrics-k8s-stack 部署监控系统

### 目录结构

```txt
monitoring
├── dashboards
│   ├── kustomization.yaml
│   └── router.json
├── kustomization.yaml
├── namespace.yaml
├── values.yaml
└── vm-hostpath-pv.yaml
```

## 使用 EnvoyGateway 暴露 Grafana

TODO
