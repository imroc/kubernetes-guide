# 使用 operator 部署 VictoriaMetrics

## VictoriaMetrics 架构概览

以下是 VictoriaMetrics 的核心组件架构图:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220904161934.png)

* `vmstorage` 负责存储数据，是有状态组件。
* `vmselect` 负责查询数据，Grafana 添加 Prometheus 数据源时使用 `vmselect` 地址，查询数据时，`vmselect` 会调用各个 `vmstorage` 的接口完成数据的查询。
* `vminsert` 负责写入数据，采集器将采集到的数据 "吐到" `vminsert`，然后 `vminsert` 会调用各个 `vmstorage` 的接口完成数据的写入。
* 各个组件都可以水平伸缩，但不支持自动伸缩，因为伸缩需要修改启动参数。

## 安装 operator

使用 helm 安装:

```bash
helm repo add vm https://victoriametrics.github.io/helm-charts
helm repo update
helm install victoria-operator vm/victoria-metrics-operator
```

检查 operator 是否成功启动:

```bash
$ kubectl -n monitoring get pod
NAME                                                           READY   STATUS    RESTARTS   AGE
victoria-operator-victoria-metrics-operator-7b886f85bb-jf6ng   1/1     Running   0          20s
```

## 安装 VMSorage, VMSelect 与 VMInsert

准备 `vmcluster.yaml`:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMCluster
metadata:
  name: vmcluster
  namespace: monitoring
spec:
  retentionPeriod: "1" # 默认单位是月，参考 https://docs.victoriametrics.com/Single-server-VictoriaMetrics.html#retention
  vmstorage:
    replicaCount: 2
    storage:
      volumeClaimTemplate:
        metadata:
          name: data
        spec:
          accessModes: [ "ReadWriteOnce" ]
          storageClassName: cbs
          resources:
            requests:
              storage: 100Gi
  vmselect:
    replicaCount: 2
  vminsert:
    replicaCount: 2
```

安装:

```bash
$ kubectl apply -f vmcluster.yaml
vmcluster.operator.victoriametrics.com/vmcluster created
```

检查组件是否启动成功:

```bash
$ kubectl -n monitoring get pod | grep vmcluster
vminsert-vmcluster-77886b8dcb-jqpfw                            1/1     Running   0          20s
vminsert-vmcluster-77886b8dcb-l5wrg                            1/1     Running   0          20s
vmselect-vmcluster-0                                           1/1     Running   0          20s
vmselect-vmcluster-1                                           1/1     Running   0          20s
vmstorage-vmcluster-0                                          1/1     Running   0          20s
vmstorage-vmcluster-1                                          1/1     Running   0          20s
```

## 安装 VMAlertmanager 与 VMAlert

准备 `vmalertmanager.yaml`:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlertmanager
metadata:
  name: vmalertmanager
  namespace: monitoring
spec:
  replicaCount: 1
  selectAllByDefault: true
```

安装 `VMAlertmanager`:

```bash
$ kubectl apply -f vmalertmanager.yaml
vmalertmanager.operator.victoriametrics.com/vmalertmanager created
```

准备 `vmalert.yaml`:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAlert
metadata:
  name: vmalert
  namespace: monitoring
spec:
  replicaCount: 1
  selectAllByDefault: true
  notifier:
    url: http://vmalertmanager-vmalertmanager:9093
  resources:
    requests:
      cpu: 10m
      memory: 10Mi
  remoteWrite:
    url: http://vminsert-vmcluster:8480/insert/0/prometheus/
  remoteRead:
    url: http://vmselect-vmcluster:8481/select/0/prometheus/
  datasource:
    url: http://vmselect-vmcluster:8481/select/0/prometheus/
```

安装 `VMAlert`:

```bash
$ kubectl apply -f vmalert.yaml
vmalert.operator.victoriametrics.com/vmalert created
```

检查组件是否启动成功:

```bash
$ kubectl -n monitoring get pod | grep vmalert
vmalert-vmalert-5987fb9d5f-9wt6l                               2/2     Running   0          20s
vmalertmanager-vmalertmanager-0                                2/2     Running   0          40s
```

## 安装 VMAgent

vmagent 用于采集监控数据并发送给 VictoriaMetrics 进行存储，对于腾讯云容器服务上的容器监控数据采集，需要用自定义的 `additionalScrapeConfigs` 配置，准备自定义采集规则配置文件 `scrape-config.yaml`:

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: additional-scrape-configs
  namespace: monitoring
stringData:
  additional-scrape-configs.yaml: |-
    - job_name: "tke-cadvisor"
      scheme: https
      metrics_path: /metrics/cadvisor
      tls_config:
        insecure_skip_verify: true
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__meta_kubernetes_node_label_node_kubernetes_io_instance_type]
        regex: eklet
        action: drop
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
    - job_name: "tke-kubelet"
      scheme: https
      metrics_path: /metrics
      tls_config:
        insecure_skip_verify: true
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__meta_kubernetes_node_label_node_kubernetes_io_instance_type]
        regex: eklet
        action: drop
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
    - job_name: "tke-probes"
      scheme: https
      metrics_path: /metrics/probes
      tls_config:
        insecure_skip_verify: true
      authorization:
        credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__meta_kubernetes_node_label_node_kubernetes_io_instance_type]
        regex: eklet
        action: drop
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
    - job_name: eks
      honor_timestamps: true
      metrics_path: '/metrics'
      params:
        collect[]: ['ipvs']
        # - 'cpu'
        # - 'meminfo'
        # - 'diskstats'
        # - 'filesystem'
        # - 'load0vg'
        # - 'netdev'
        # - 'filefd'
        # - 'pressure'
        # - 'vmstat'
      scheme: http
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_tke_cloud_tencent_com_pod_type]
        regex: eklet
        action: keep
      - source_labels: [__meta_kubernetes_pod_phase]
        regex: Running
        action: keep
      - source_labels: [__meta_kubernetes_pod_ip]
        separator: ;
        regex: (.*)
        target_label: __address__
        replacement: ${1}:9100
        action: replace
      - source_labels: [__meta_kubernetes_pod_name]
        separator: ;
        regex: (.*)
        target_label: pod
        replacement: ${1}
        action: replace
      - source_labels: [__meta_kubernetes_namespace]
        separator: ;
        regex: (.*)
        target_label: namespace
        replacement: ${1}
        action: replace
      metric_relabel_configs:
      - source_labels: [__name__]
        separator: ;
        regex: (container_.*|pod_.*|kubelet_.*)
        replacement: $1
        action: keep
```

再准备 `vmagent.yaml`:

```yaml
apiVersion: operator.victoriametrics.com/v1beta1
kind: VMAgent
metadata:
  name: vmagent
  namespace: monitoring
spec:
  selectAllByDefault: true
  additionalScrapeConfigs:
    key: additional-scrape-configs.yaml
    name: additional-scrape-configs
  resources:
    requests:
      cpu: 10m
      memory: 10Mi
  replicaCount: 1
  remoteWrite:
  - url: "http://vminsert-vmcluster:8480/insert/0/prometheus/api/v1/write"
```

安装:

```bash
$ kubectl apply -f scrape-config.yaml
secret/additional-scrape-configs created
$ kubectl apply -f vmagent.yaml
vmagent.operator.victoriametrics.com/vmagent created
```

检查组件是否启动成功:

```bash
$ kubectl -n monitoring get pod | grep vmagent
vmagent-vmagent-cf9bbdbb4-tm4w9                                2/2     Running   0          20s
vmagent-vmagent-cf9bbdbb4-ija8r                                2/2     Running   0          20s
```

## 配置 Grafana

### 添加数据源

VictoriaMetrics 兼容 Prometheus，在 Grafana 添加数据源时，使用 Prometheus 类型，如果 Grafana 跟 VictoriaMetrics 安装在同一集群中，可以使用 service 地址，如:

```txt
http://vmselect-vmcluster:8481/select/0/prometheus/
```

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220904160422.png)

### 添加 Dashboard

VictoriaMetrics 官方提供了几个 Grafana Dashboard，id 分别是:
1. 11176
2. 12683
3. 14205

可以将其导入 Grafana:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220904160727.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220904161558.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220904161641.png)