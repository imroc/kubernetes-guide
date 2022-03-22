# Pod 绑 EIP

腾讯云容器服务的 TKE 暂不支持 Pod 绑 EIP，但 EKS 集群(弹性集群) 是支持的，且需要配置 yaml，加上相应的注解，本文给出实例。

## yaml 示例

EKS 的 EIP 核心注解是 `eks.tke.cloud.tencent.com/eip-attributes`，内容可以填写创建 EIP 接口的相关的参数，详细参数列表参考 [这里](https://cloud.tencent.com/document/api/215/16699#2.-.E8.BE.93.E5.85.A5.E5.8F.82.E6.95.B0) 。

下面给出一个简单示例，为每个 Pod 副本都绑定带宽上限 50Mbps，按流量计费的 EIP:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eip
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eip
  template:
    metadata:
      labels:
        app: eip
      annotations:
        'eks.tke.cloud.tencent.com/eip-attributes': '{"InternetMaxBandwidthOut":50, "InternetChargeType":"TRAFFIC_POSTPAID_BY_HOUR"}'
    spec:
      containers:
      - name: eip
        image: cr.imroc.cc/library/net-tools:latest
        command:
        - sleep
        - infinity
```

## 如何在容器内获取自身公网 IP ？

可以利用 K8S 的 [Downward API](https://kubernetes.io/zh/docs/tasks/inject-data-application/environment-variable-expose-pod-information/) ，将 Pod 上的一些字段注入到环境变量或挂载到文件，Pod 的 EIP 信息最终会写到 Pod 的 `tke.cloud.tencent.com/eip-public-ip` 这个 annotation 上，但不会 Pod 创建时就写上，是在启动过程写上去的，所以如果注入到环境变量最终会为空，挂载到文件就没问题，以下是使用方法:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eip
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eip
  template:
    metadata:
      labels:
        app: eip
    spec:
      containers:
      - name: eip
        image: cr.imroc.cc/library/net-tools:latest
        command:
        - sleep
        - infinity
        volumeMounts:
        - mountPath: /etc/podinfo
          name: podinfo
      volumes:
      - name: podinfo
        downwardAPI:
          items:
          - path: "labels"
            fieldRef:
              fieldPath: metadata.labels
          - path: "annotations" # 关键
            fieldRef:
              fieldPath: metadata.annotations
```

容器内进程启动时可以读取 `/etc/podinfo/annotations` 中的内容来获取 EIP。


## 如何保留 EIP

需要使用 StatefulSet 部署，且加上 `eks.tke.cloud.tencent.com/eip-claim-delete-policy: "Never"` 这个 annotation:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  labels:
    app: eip
  name: eip
spec:
  serviceName: ""
  replicas: 1
  selector:
    matchLabels:
      app: eip
  template:
    metadata:
      annotations:
        eks.tke.cloud.tencent.com/eip-attributes: "{}"
        eks.tke.cloud.tencent.com/eip-claim-delete-policy: "Never" # 关键
      labels:
        app: eip
    spec:
      containers:
      - name: eip
        image: cr.imroc.cc/library/net-tools:latest
        command:
        - sleep
        - infinity
```