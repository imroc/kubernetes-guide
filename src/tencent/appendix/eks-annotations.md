# EKS 注解

本文介绍 EKS 集群特有的注解与示例，全部注解列表及其解释请参考 [官方文档](https://cloud.tencent.com/document/product/457/44173)。

## 资源调度

### 指定机型调度

Pod 上加注解:

```yaml
eks.tke.cloud.tencent.com/cpu-type: 'S6,C6,S5,C5,amd,intel' # 调度时按此机型顺序作为优先级顺序进行调度，如果都资源不足，使用 `amd,intel` 作为兜底策略。
```

> Pod 创建出来可以通过查看 `cloud.tencent.com/instance-type` 这个 label 来确认其被实际分配到的机型。

### 指定 GPU 调度

Pod 上加注解:

```yaml
eks.tke.cloud.tencent.com/gpu-count: '1' # 指定 GPU 卡数。
eks.tke.cloud.tencent.com/gpu-type: 'T4,V100' # 指定 GPU 型号，支持优先级顺序写法。
```

### 指定规格

EKS 默认会根据 request 与 limit 自动计算出底层资源的规格，参考官方文档 [指定资源规格](https://cloud.tencent.com/document/product/457/44174)，也可以显式通过给 Pod 加注解去指定 Pod 需要的计算资源规格:

```yaml
eks.tke.cloud.tencent.com/cpu: "8"
eks.tke.cloud.tencent.com/mem: "16Gi"
```

## IP 保留与 EIP

### 固定 IP

使用固定 IP 的前提是工作负载是 StatefulSet，或者直接用裸 Pod （关键点在于 Pod 名称不能变），在 Pod 级别加注解启用固定 IP:

```yaml
eks.tke.cloud.tencent.com/retain-ip: 'true' # 置为 true 启用固定 IP。
eks.tke.cloud.tencent.com/retain-ip-hours: '48' # 保留 IP 的最大时长(小时)，Pod 销毁之后超过这个时长没有创建回来，IP 将被释放。
```

### 绑定 EIP

Pod 级别加注解:

```yaml
eks.tke.cloud.tencent.com/eip-attributes: '{"InternetMaxBandwidthOut":50, "InternetChargeType":"TRAFFIC_POSTPAID_BY_HOUR"}' # 值可以为空串，表示启用 EIP 并使用默认配置；也可以用创建 EIP 接口的 json 参数，详细参数列表参考 [这里](https://cloud.tencent.com/document/api/215/16699#2.-.E8.BE.93.E5.85.A5.E5.8F.82.E6.95.B0)，本例中的参数表示 EIP 是按量付费，且带宽上限为 50M。
```

### 固定 EIP

Pod 级别加注解:

```yaml
eks.tke.cloud.tencent.com/eip-attributes: "{}" # 启用 EIP 并使用默认配置。
eks.tke.cloud.tencent.com/eip-claim-delete-policy: "Never" # Pod 删除后，EIP 是否自动回收，默认回收。使用 "Never" 不回收，即下次同名 Pod 创建出来仍然会绑定此 EIP，实现固定 EIP。
```

### 使用已有 EIP

如果想要将已有的 EIP 绑定到 Pod 而不是自动创建，可以给 Pod 指定要绑定的 EIP 实例 id:

```yaml
eks.tke.cloud.tencent.com/eip-attributes: "{}" # 启用 EIP 并使用默认配置。
eks.tke.cloud.tencent.com/eip-id-list: "eip-xx1,eip-xx2" # 这里指定已有的 EIP 实例列表，确保 StatefulSet 的 Pod 副本数小于等于这里的 EIP 实例数。
```

## 镜像仓库

### 忽略证书校验

如果自建镜像仓库的证书是自签的，EKS 拉取镜像会失败 (ErrImagePull)，可以给 Pod 指定下拉取这个镜像仓库的镜像不校验证书:

```yaml
eks.tke.cloud.tencent.com/registry-insecure-skip-verify: 'harbor.example.com' # 也可以写多个，逗号隔开
```

### 使用 HTTP 协议

如果自建镜像仓库使用的 HTTP 而不是 HTTPS，EKS 拉取镜像会失败 (ErrImagePull)，可以给 Pod 指定下拉取这个镜像仓库的镜像使用 HTTP 协议:

```yaml
eks.tke.cloud.tencent.com/registry-http-endpoint: 'harbor.example.com' # 也可以写多个，逗号隔开
```

## 绑定安全组

EKS 默认会为 Pod 绑定同地域的 `default` 安全组，也可以通过给 Pod 加注解绑定指定安全组:

```yaml
eks.tke.cloud.tencent.com/security-group-id: 'sg-id1,sg-id2' # 填本地域存在的安全组 id，多个用逗号隔开，网络策略按安全组顺序生效，安全组默认最多只能绑定 2000 个 Pod，如需更多请提工单提升配额。
```

## 设置宿主机内核参数

有些内核参数是网络命名空间隔离的，容器内看不到，也不能在容器内设置，EKS Pod 虽然是独占虚拟机，但不代表就能在容器内直接设置宿主机上的内核参数。

可以通过给 Pod 加注解来实现设置 Pod 宿主机内核参数:

```yaml
eks.tke.cloud.tencent.com/host-sysctls: '[{"name": "net.core.rmem_max","value": "26214400"},{"name": "net.core.wmem_max","value": "26214400"},{"name": "net.core.rmem_default","value": "26214400"},{"name": "net.core.wmem_default","value": "26214400"}]'
```