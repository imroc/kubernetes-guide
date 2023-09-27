# 安装 KubeSphere

## 概述

本文介绍在腾讯云容器服务上如何安装 KubeSphere 及其踩坑与注意事项。

## 安装步骤

具体安装步骤参考 KubeSphere 官方文档：[在腾讯云 TKE 安装 KubeSphere](https://kubesphere.io/zh/docs/installing-on-kubernetes/hosted-kubernetes/install-ks-on-tencent-tke/)。

## 踩坑与注意事项

### cbs 磁盘容量以 10Gi 为倍数

腾讯云容器服务默认使用 CBS 云硬盘作为存储，容量只支持 10Gi 的倍数，如果定义 pvc 时指定的容量不是 10Gi 的倍数，就会挂盘失败。

安装 KubeSphere 时，修改下 `ClusterConfiguration` 中各个组件的 `volumeSize` 配置，确保是 10Gi 的倍数。

### 卸载卡住与卸载不干净导致重装失败

有时安装出问题，希望卸载重装，使用 KubeSphere 官方文档 [从 Kubernetes 上卸载 KubeSphere](https://kubesphere.io/zh/docs/installing-on-kubernetes/uninstall-kubesphere-from-k8s/) 中的 `kubesphere-delete.sh` 脚本进行清理，可能会出现卡住的情况。

通常是有 finalizer 的原因:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/企业微信截图_06c82094-d4da-4199-9380-78cc76c05810.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/企业微信截图_cc7a9842-618d-4d77-9f6e-43a5ffb078e3.png)

编辑资源删除相应 finalizer 即可。

如果清理不干净，重装还会报错:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/dirty-clusterrole.png)

通常是关联的一些 MutatingWebhookConfiguration，ValidatingWebhookConfiguration, ClusterRole, ClusterRoleBinding 等资源没清理，可以根据 ks-installer 日志定位并清理。

### 监控不兼容导致看不到超级节点中 Pod 的监控

KubeSphere 部署完后看工作负载的 Pod 列表，没有超级节点上 Pod 的监控数据:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220901152659.png)

是因为 KubeSphere 启用的监控，采集 cadvisor 监控数据的采集规则是，访问所有节点的 10250 端口去拉监控数据，而超级节点的 IP 是个无法路由的 “假” IP，所以拉不到数据。

解决方案：按照以下步骤增加自定义采集规则。

1. 准备 secret yaml `scrape-config.yaml`:

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: additional-scrape-configs
  namespace: kubesphere-monitoring-system
stringData:
  additional-scrape-configs.yaml: |-
    - job_name: kubelet # eks cadvisor 监控，为兼容 ks 查询，固定 job 名为 kubelet
      honor_timestamps: true
      metrics_path: '/metrics'
      params:
        collect[]:
        - 'ipvs'
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
        regex: container_.*
        replacement: $1
        action: keep
      - target_label: metrics_path
        replacement: /metrics/cadvisor
        action: replace
    - job_name: eks # eks cadvisor 之外的其它监控
      honor_timestamps: true
      metrics_path: '/metrics'
      params:
        collect[]:
        - 'ipvs'
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

2. 创建 secret:

```bash
kubectl apply -f scrape-config.yaml
```

3. 修改 Prometheus CR:

```bash
kubectl -n kubesphere-monitoring-system edit prometheuses.monitoring.coreos.com k8s
```

加入 `additionalScrapeConfigs`:

```yaml
spec:
  additionalScrapeConfigs:
    key: additional-scrape-configs.yaml
    name: additional-scrape-configs
```

###  ks-apiserver 出现 crash

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/ks-apiserver-crash.png)

一般是 kubesphere 的 chart 包不完善，crd 没装完整，可以手动装一下:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubesphere/notification-manager/master/config/bundle.yaml
```

> 参考: https://kubesphere.com.cn/forum/d/7610-ks-330-ks-apiserver-crash/3