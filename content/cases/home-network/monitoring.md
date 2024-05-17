# 监控系统：VictoriaMetrics + Grafana

## 云原生家庭网络监控系统

如何打造一个云原生家庭网络的监控系统？该如何选型？毫无疑问，在云原生领域，`Prometheus` 生态已成为监控标配，通常都会部署 `Prometheus` 来采集监控数据，配合 `Grafana` 来展示监控面板。

但是，`Prometheus` 的监控数据会占用很大的存储空间，采集数据时也会占用很大的内存，而路由器的计算资源往往都比较小，可不能像服务器那样奢侈。

好在 [VictoriaMetrics](https://docs.victoriametrics.com/quick-start) 提供了很好的解决方案，兼容 `Prometheus` 的同时，有更强的性能，占用更小的存储空间和内存，在路由器上替代 `Prometheus` 再合适不过了，所以，本文将基于 `VictoriaMetrics` 在路由器上部署监控系统。

## victoria-metrics-k8s-stack

`Prometheus` 社区提供了 [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) 这个 helm chart 来部署 `Prometheus` 及其生态内相关的产品，相应的，`VictoriaMetrics` 社区提供了对等的 chart: [victoria-metrics-k8s-stack](https://github.com/VictoriaMetrics/helm-charts/tree/master/charts/victoria-metrics-k8s-stack)。

实际上路由器上的监控需求相对监控，也可以直接自己手工写 `VictoriaMetrics` + `Grafana` 的部署 YAML，但这个不利于后续的升级，升级不单单是升级容器镜像，相应的 YAML 和应用配置都可能改动，所以如果是要打算后续持续升级，享受最新的功能，建议是用社区的 `victoria-metrics-k8s-stack` 这个 helm chart 安装。

## 部署 EnvoyGateway

由于使用社区的 chart 部署，但 chart 中不直接指定 `Grafana` 使用 `HostNetwork` 部署，那我们可以使用

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

### 配置监控面板

`dashboards` 目录的作用就是配置我们需要自定义的 `Grafana` 监控面板，`router.json` 就是监控面板的定义，通过 `kustomize` 将 json 文件存储到 `ConfigMap` 中，以下是 `dashboards/kustomization.yaml` 的定义：

```yaml showLineNumbers title="dashboards/kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generatorOptions:
  disableNameSuffixHash: true
  labels:
    grafana_dashboard: "1"

configMapGenerator:
  - files:
      - router.json
    name: router
```

要点解析：
* 通过 `configMapGenerator` 引用 `router.json`，将 `Grafana` 监控面板保存到名为 `router` 的 `ConfigMap` 中。后续有需要其它的自定义面板，也可以直接在这里增加。
* 通过 `generatorOptions` 为自动生成的 `ConfigMap` 加上 `grafana_dashboard: "1"` 的 label，这个很关键，用作 `Grafana` 的 Sidecar 对监控面板的自动发现，以便让 `Grafana` 能够展示我们自定义的面板。

通常使用 `node-exporter` 提供的监控指标来捏监控面板，社区有开源的 `Node Exporter Full` 这样的监控面板，但太多了，一般我们可以根据自己的重点关注内容，自己来捏一个适合自己的面板，这里分享下我自己捏的面板(`router.json`)：

<FileBlock file="home-network/router.json" showLineNumbers title="dashboards/router.json" />

展示效果：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F17%2F20240517104922.png)
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F17%2F20240517104953.png)
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F17%2F20240517105020.png)
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F17%2F20240517105050.png)

### 配置主要的 kustomization.yaml

下面我们来配主要的 `kustomization.yaml`：

```yaml showLineNumbers title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: monitoring

resources:
  - namespace.yaml
  - vm-hostpath-pv.yaml
  - dashboards

helmCharts:
  - repo: https://victoriametrics.github.io/helm-charts
    name: victoria-metrics-k8s-stack
    releaseName: monitoring
    namespace: monitoring
    valuesFile: values.yaml
```

要点解析：
* `namespace` 指定为 `monitoring`，因为监控系统涉及多个组件，单独放到一个命名空间里，方便管理。
* `resources` 引用 `namespace.yaml`，用于创建 `monitoring` 命名空间。
* `resources` 引用 `vm-hostpath-pv.yaml`，用于为 `VictoriaMetrics` 挂载 `hostPath` 的 `PV`（因为 chart 里没有提供直接定义 volume 类型的选项，只有手动定一个 `hostPath` 类型的 `PV` 来被 `PVC` 绑定）。
* `resources` 引用 `dashboards` 目录，相当于将前面配置的监控面板加进来。
* `helmCharts` 引用 `victoria-metrics-k8s-stack` 这个 chart，并提供 `values.yaml` 来自定义配置。

### 配置 namespace.yaml

```yaml showLineNumbers title="namespace.yaml"
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
```

### 配置 values.yaml

```yaml showLineNumbers title="value.syaml"
defaultRules:
  create: false
defaultDashboardsEnabled: false
experimentalDashboardsEnabled: false
coreDns:
  enabled: false
alertmanager:
  enabled: false
vmalert:
  enabled: false
kubeApiServer:
  enabled: false
kubeControllerManager:
  enabled: false
kubeEtcd:
  enabled: false
kubeScheduler:
  enabled: false

victoria-metrics-operator:
  createCRD: true

vmagent:
  enabled: true
  spec:
    scrapeInterval: 10s
    externalLabels: null

vmsingle:
  enabled: true
  spec:
    resources:
      limits:
        cpu: 1200m
        memory: 1500Mi
    storage:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
      storageClassName: ""
      volumeMode: Filesystem
      volumeName: vm-storage

grafana:
  service:
    type: LoadBalancer
    port: 3000
  #grafana.ini:
  #  users:
  #    home_page: /d/VCx4Fck4k/e8b7af-e794b1-e599a8-e79b91-e68ea7-e5a4a7-e79b98
  adminPassword: "123456"
  adminUser: "admin"
  defaultDashboardsTimezone: "Asia/Shanghai"
  auth:
    anonymous:
      enabled: true
      org_name: Main Org.
      org_role: Viewer
      hide_version: false
  testFramework:
    enabled: false
```

要点解析：
* 通过很多 `enabled: false` 禁用掉很多不需要的组件和功能。
* 启用 `vmagent` 用于采集监控配置，配置 `scrapeInterval` 可调整采集时间间隔。
* 启用 `vmsingle` 用于存储监控数据，`storage` 配置 `PVC` 的定义，指定 `volumeName` 为 `vm-storage`，与后续我们手动定义的 `hostPath` 类型的 `PV` 同名，以便让 `PVC` 能够自动绑定该 `PV`。
* `grafana` 的 `service.type` 指定为 `LoadBalancer`，k3s 内置了 `servicelb` 作为 `LoadBalancer` 类型 `Service` 的实现，会自动为 `LoadBalancer` 类型的 `Service` 在集群中每个节点都开一个 `Service` 中声明的端口。这里端口指定为 `3000`，即访问路由器的 `3000` 端口就能访问到 `Grafana` 面板。
* `grafana` 的 `adminUser` 和 `adminPassword` 分别指定管理员的账号密码，用于登录 `Grafana`。
* `grafana` 的 `defaultDashboardsTimezone` 指定 `Grafana` 页面显示时所用的时区，国内我们使用 `Asia/Shanghai`。
* 我们可能希望进入 `Grafana` 时默认显示我们自定义的监控面板，可以在进入自定义面板页面后，复制其路径，然后取消上面的 `grafana.ini` 的注释，替换 `home_page` 的值为复制的路径，这样后续我们进入 `Grafana` 页面就默认显示自定义的监控面板了。

### 配置 vm-hostpath-pv.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: vm-storage
spec:
  accessModes:
    - ReadWriteOnce
  capacity:
    storage: 10Gi
  hostPath:
    path: /data/victoria
    type: DirectoryOrCreate
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  volumeMode: Filesystem
```
