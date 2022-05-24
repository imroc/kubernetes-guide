# EKS 注解

本文介绍 EKS 集群特有的注解与示例。

## 注解使用方法

本文所说的注解基本是在 Pod 级别上使用，通常我们使用的都是工作负载而不是裸 Pod，下面给个 Deployment 上加 EKS Pod 注解示例:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
      annotations:
        eks.tke.cloud.tencent.com/retain-ip: 'true' # 工作负载里加 Pod 注解是在 .spec.template.metadata.annotations 字段里加
    spec:
      containers:
      - name: nginx
        image: nginx
```

如果希望注解默认对集群里所有 Pod 生效，也可以修改全局配置 (kube-system 命名空间下名为 eks-config 的 configmap，没有的话可以自行新建一个):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: eks-config
  namespace: kube-system
data:
  pod.annotations: |
    eks.tke.cloud.tencent.com/resolv-conf: |
      nameserver 183.60.83.19 
    eks.tke.cloud.tencent.com/host-sysctls: '[{"name": "net.core.rmem_max","value": "26214400"}]'
```

> 直接在 Pod 上加的注解优先级高于全局配置。

## 资源与规格

### 指定 CPU 与内存

EKS 默认会根据 request 与 limit 自动计算出底层资源的规格，参考官方文档 [指定资源规格](https://cloud.tencent.com/document/product/457/44174)，也可以显式通过给 Pod 加注解去指定 Pod 需要的计算资源规格:

```yaml
eks.tke.cloud.tencent.com/cpu: '8'
eks.tke.cloud.tencent.com/mem: '16Gi' # 内存一定要以Gi为单位，以G为单位则会报参数错误
```

### 自动升配

EKS 会按照 request 与 limit 自动计算出匹配的底层资源规格。如果对应的规格底层无相应资源，则会创建失败并在事件中提示资源不足 (`insufficient resource`)。如果接受使用更高规格的资源来创建 Pod，则可在 Pod 加上如下注解，开启自动升配，计费也会按照升配后的规格计算:

```yaml
eks.tke.cloud.tencent.com/spec-auto-upgrade: 'true' # 遇到资源不足时，开启自动升配，只按 CPU 规格向上升配一次
```

### 指定 GPU

Pod 上加注解:

```yaml
eks.tke.cloud.tencent.com/gpu-count: '1' # 指定 GPU 卡数。
eks.tke.cloud.tencent.com/gpu-type: 'T4,V100' # 指定 GPU 型号，支持优先级顺序写法。
```

### 指定 CPU 类型

Pod 上加注解:

```yaml
eks.tke.cloud.tencent.com/cpu-type: 'amd,intel' # 表示优先创建 amd 资源 Pod，如果所选地域可用区 amd 资源不足，则会创建 intel 资源 Pod
```

### 竞价模式

Pod 上加如下注解可以开启 [竞价模式](https://cloud.tencent.com/document/product/457/59364)：

```yaml
eks.tke.cloud.tencent.com/spot-pod: 'true'
```

## IP 保留与 EIP

### StatefulSet 固定 IP

使用固定 IP 的前提是工作负载是 StatefulSet，或者直接用裸 Pod （关键点在于 Pod 名称不能变），在 Pod 级别加注解启用固定 IP:

```yaml
eks.tke.cloud.tencent.com/retain-ip: 'true' # 置为 true 启用固定 IP。
eks.tke.cloud.tencent.com/retain-ip-hours: '48' # 保留 IP 的最大时长(小时)，Pod 销毁之后超过这个时长没有创建回来，IP 将被释放。
```

> TKE 虚拟节点场景下的固定 IP，用法保持跟 TKE 一致，无需加上述注解

### 绑定 EIP

Pod 级别加注解:

```yaml
eks.tke.cloud.tencent.com/eip-attributes: '{"InternetMaxBandwidthOut":50, "InternetChargeType":"TRAFFIC_POSTPAID_BY_HOUR"}' # 值可以为空串，表示启用 EIP 并使用默认配置；也可以用创建 EIP 接口的 json 参数，详细参数列表参考 [这里](https://cloud.tencent.com/document/api/215/16699#2.-.E8.BE.93.E5.85.A5.E5.8F.82.E6.95.B0)，本例中的参数表示 EIP 是按量付费，且带宽上限为 50M。
```

### StatefulSet 固定 EIP

Pod 级别加注解:

```yaml
eks.tke.cloud.tencent.com/eip-attributes: '{}' # 启用 EIP 并使用默认配置。
eks.tke.cloud.tencent.com/eip-claim-delete-policy: 'Never' # Pod 删除后，EIP 是否自动回收，默认回收。使用 "Never" 不回收，即下次同名 Pod 创建出来仍然会绑定此 EIP，实现固定 EIP。
```
> 注意：Deployment类型的工作负载使用 "Never" 不回收策略时，Pod 删除后 EIP 不会回收，滚动更新后的 Pod 也不会使用原本的 EIP。

### StatefulSet 使用已有 EIP

如果想要将已有的 EIP 绑定到 Pod 而不是自动创建，可以给 Pod 指定要绑定的 EIP 实例 id:

```yaml
eks.tke.cloud.tencent.com/eip-id-list: 'eip-xx1,eip-xx2' # 这里指定已有的 EIP 实例列表，确保 StatefulSet 的 Pod 副本数小于等于这里的 EIP 实例数。
```
> 指定 EIP 场景下，请勿配置 eip-attributes 这个注解

## 镜像与仓库

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

### 镜像复用

EKS 默认会复用系统盘以加快启动速度，复用的是同一工作负载下相同可用区 Pod 且在缓存时间内(销毁后6小时内)的系统盘。如果想要复用不同工作负载的 Pod 的镜像，可以在不同工作负载的 Pod 上打上相同的 `cbs-reuse-key` 的注解:

```yaml
eks.tke.cloud.tencent.com/cbs-reuse-key: 'image-name'
```

### 镜像缓存

EKS 提供 [镜像缓存能力](https://cloud.tencent.com/document/product/457/65908)，即提前创建好镜像缓存实例，自动将需要的镜像下载下来并创建云盘快照，后续创建 Pod 开启镜像缓存，这样就会根据镜像名自动匹配镜像缓存实例的快照，直接使用快照里面的镜像内容，避免重复下载，加快 Pod 启动速度。

启用镜像缓存的注解:

```yaml
eks.tke.cloud.tencent.com/use-image-cache: 'auto'
```

你也可以手动指定镜像缓存实例，不使用自动匹配:

```yaml
eks.tke.cloud.tencent.com/use-image-cache: 'imc-xxx'
```

镜像缓存创建出来的数据盘，在 Pod 删除后会立即销毁。如果需额外保留镜像缓存创建的数据盘，可以通过注解指定保留时间。开启数据盘保留后，下次创建 Pod 的时候会直接复用保留中的盘，可节省数据再重新从快照回滚至新云硬盘的时间：

```yaml
eks.tke.cloud.tencent.com/image-cache-disk-retain-minute: '10' # 设定镜像缓存创建的数据盘，在销毁 Pod 后保留10分钟
```

## 绑定安全组

EKS 默认会为 Pod 绑定同地域默认项目下的 `default` 安全组，也可以通过给 Pod 加注解绑定指定安全组:

```yaml
eks.tke.cloud.tencent.com/security-group-id: 'sg-id1,sg-id2' # 填本地域存在的安全组 id，多个用逗号隔开，网络策略按安全组顺序生效，安全组默认最多只能绑定 2000 个 Pod，如需更多请提工单提升配额。
```

## 绑定角色

EKS 默认会为 Pod 关联 `TKE_QCSLinkedRoleInEKSLog` 角色，授予 Pod 里日志采集组件上报日志的权限。用户也可通过注解为 Pod 关联其他 CAM 角色，方便从 Pod 内获取操作云上资源的权限。

```yaml
eks.tke.cloud.tencent.com/role-name: 'TKE_QCSLinkedRoleInEKSLog'
```

## 设置宿主机内核参数

有些内核参数是网络命名空间隔离的，容器内看不到，也不能在容器内设置，EKS Pod 虽然是独占虚拟机，但不代表就能在容器内直接设置宿主机上的内核参数。

可以通过给 Pod 加注解来实现设置 Pod 宿主机内核参数:

```yaml
eks.tke.cloud.tencent.com/host-sysctls: '[{"name": "net.core.rmem_max","value": "26214400"},{"name": "net.core.wmem_max","value": "26214400"},{"name": "net.core.rmem_default","value": "26214400"},{"name": "net.core.wmem_default","value": "26214400"}]'
```

## 加载内核模块

Pod 上通过如下注解可以加载 [TOA 内核模块](https://cloud.tencent.com/document/product/608/18945):

```yaml
eks.tke.cloud.tencent.com/host-modprobe: 'toa'
```

## 自动重建自愈

EKS 虚拟机内的 agent 会上报心跳给控制面，如果上报超时 (默认5min)，一般说明 Pod 内进程已经几乎无法正常工作了，通常是高负载，这时 EKS 默认会自动迁移虚拟机 (对当前虚拟机关机并自动创建新虚拟机，让 Pod "飘" 到新虚拟机里去运行)，从而实现自愈。

如果不希望自动重建(比如用于保留现场)，可以在 Pod 上加上此注解:

```yaml
eks.tke.cloud.tencent.com/recreate-node-lost-pod: "false"
```

如果觉得默认的 5min 上报超时时间过长，希望及时摘除异常 Pod 的流量，可以在 Pod 上加此注解来自定义心跳超时时间:

```yaml
eks.tke.cloud.tencent.com/heartbeat-lost-period: 1m 
```

## 磁盘清理

当 EKS 虚拟机磁盘空间紧张的时候，会自动触发清理流程以释放空间，通过 `df -h` 可以确认磁盘使用情况。

常见磁盘空间不足的原因有：
* 业务有大量临时输出。您可以通过 du 命令确认。
* 业务持有已删除的文件描述符，导致磁盘空间未释放。您可以通过 lsof 命令确认。

### 清理容器镜像

默认情况下，磁盘空间达 80% 以上会自动清理容器镜像来释放空间，如果已经没有容器镜像可以释放，就会报类似以下的事件:

```txt
failed to garbage collect required amount of images. Wanted to free 7980402688 bytes, but freed 0 bytes
```

这个清理的阈值可以通过 Pod 注解来自定义:

```yaml
eks.tke.cloud.tencent.com/image-gc-high-threshold: '80' # 表示磁盘使用空间达 80% 触发清理容器镜像
eks.tke.cloud.tencent.com/image-gc-low-threshold: '75' # 触发清理容器镜像后，默认释放 5% (high-threshold - low-threshold) 的磁盘空间，便停止清理
eks.tke.cloud.tencent.com/image-gc-period: '3m' # 磁盘空间检查的间隔，默认3分钟
```

### 清理已退出的容器

如果业务原地升级过，或者容器异常退出过，已退出的容器仍会保留，直到磁盘空间达到 85% 时才会清理已退出的容器。清理阈值可以使用如下 annotation 调整：

```yaml
eks.tke.cloud.tencent.com/container-gc-threshold: "85"
```

如果已退出的容器不想被自动清理（例如需要退出的信息进一步排障的），可以通过如下 annotation 关闭容器的自动清理，但副作用是磁盘空间无法自动释放：

```yaml
eks.tke.cloud.tencent.com/must-keep-last-container: "true"
```

### 重启磁盘用量高的 Pod

业务需要在容器的系统盘用量超过某个百分比后直接重启 Pod，可以通过 annotation 配置：

```yaml
eks.tke.cloud.tencent.com/pod-eviction-threshold: "85" # 此功能只在设置后开启，默认不开启
```

只重启 Pod，不会重建子机，退出和启动都会进行正常的 gracestop、prestop、健康检查。

> 此特性上线时间在 2022-04-27，故在此时间前创建的 pod，需要重建 pod 来开启特性。

## 监控指标

### 9100 端口问题

EKS 的 pod 默认会通过 9100 端口对外暴露监控数据，用户可以执行以下命令访问 9100/metrics 获取数据：

* 获取全部指标：
  ```bash
  curl -g "http://<pod-ip>:9100/metrics"
  ```
* 大集群建议去掉 ipvs 指标：
  ```bash
  curl -g "http://<pod-ip>:9100/metrics?collect[]=ipvs"
  ```
  
如果业务本身直接监听了 9100 端口， 将会有如下报错，提醒用户 9100 端口已经被使用：

```txt
listen() to 0.0.0.0:9100, backlog 511 failed (1: Operation not permitted)
```

我们可以自定义暴露监控数据的端口号，避免与业务冲突。配置方式如下：

```yaml
eks.tke.cloud.tencent.com/metrics-port: "9110"
```

> 如果 pod 带有公网 eip，则需要设置安全组，注意 9100 端口问题，并放通需要的端口。

### 监控数据上报频率

EKS 虚拟节点上暴露的 cAdvisor 监控数据，默认30秒刷新一次，可以通过如下注解调整刷新频率：

```yaml
eks.tke.cloud.tencent.com/cri-stats-interval: '30s'
```

### 自定义监控指标路径

监控数据默认通过 `/metrics` 路径暴露监控数据，一般不用动。如有自定义的需求，可以用下面的注解:

```yaml
eks.tke.cloud.tencent.com/custom-metrics-url: '/metrics'
```

## 设置 Pod 网卡名称

Pod 默认使用 `eth0`  网卡，如果需更改网卡名称，可以加上如下注解：

```yaml
internal.eks.tke.cloud.tencent.com/pod-eth-idx: '1' # 设置网卡名为 eth1 
```

## 自定义 DNS

Pod 所在宿主机默认使用 VPC 内的 DNS：183.60.83.19，183.60.82.98。如果需要更改宿主机上的 DNS，可以配置如下 annotation：

```yaml
eks.tke.cloud.tencent.com/resolv-conf: |
  nameserver 4.4.4.4
  nameserver 8.8.8.8
```
> 配置了自定义 DNS 后，则宿主机上的 DNS 以配置的为准

## 日志采集到 kafka

EKS 支持通过开源的日志采集组件将日志采集到 kafka。如果采集的是容器内文件，或者采集时进行了 [多行合并](https://cloud.tencent.com/document/product/457/54714)，则需合理配置单行大小。EKS 默认设置的单行大小是 2M，超过 2M 则会丢弃该行日志。日志的单行大小可通过如下注解调整：

```yaml
internal.eks.tke.cloud.tencent.com/tail-buffer-max-size: '2M' # 默认支持最大 2M 的单行日志
```

采集到 kafka 时，日志内容的字段为 `log`，如需将字段名配置为 `message`，则可通过如下注解调整：

```yaml
eks.tke.cloud.tencent.com/log-key-as-message: 'true'
```

日志上报时会额外携带 Pod 的 metadata 信息，信息以 `string` 的格式放在 `kubernetes` 字段，如果需要将 `kubernetes` 字段设置成 `json` 格式，需配置如下注解：

```yaml
eks.tke.cloud.tencent.com/filebeat-metadata-format: 'true'
```

## 延迟销毁

EKS 上运行的 Job 任务结束后，底层资源就会被销毁；相应的，运行时产生的临时输出，也会被销毁，此时执行 `kubectl logs <pod>` 会提示 `can not found connection to pod`。如果需要保留底层资源定位问题，可以设置延迟销毁底层资源：

```yaml
eks.tke.cloud.tencent.com/reserve-sandbox-duration: '1m' # 开启延迟 1分钟销毁的功能，Failed 状态的 Pod 最后一个容器退出后，额外保留底层资源 1分钟
eks.tke.cloud.tencent.com/reserve-succeeded-sandbox: 'false' # 延迟销毁默认只对 Failed 状态的 Pod 生效，变更此字段可将延迟销毁也应用于 Succeeded 状态的 Pod
eks.tke.cloud.tencent.com/reserve-task-shorter-than: '5s' # 如果只关心运行时间较短的 Job，可以配置此参数，只有 Pod 内有任何一个容器的运行时间低于指定值，才会触发延迟销毁。默认不开启。
```

## Service 规则同步

### 关闭 Service 规则同步

EKS 通过 IPVS 生成 k8s servcie 规则。 如果无需生成 servcie 规则，可通过如下注解关闭：

```yaml
eks.tke.cloud.tencent.com/cluster-ip-switch: 'disable'
```

> 注意：关闭servcie 规则后，则集群内的服务发现都会失效。Pod 将无法使用 `ClusterFirst` 的 `dnsPolicy`，需改成其他类型，比如 `Default`。

### 等待 Service 规则同步

EKS 在 Pod 启动的同时同步 servcie 规则，如果需要在 Pod 启动前先等待 servcie 规则同步完成，则可以配置：

```yaml
eks.tke.cloud.tencent.com/duration-to-wait-service-rules: '30s' # 启动 Pod 前先等待 servcie 规则同步完成，此处设置最多等待的时间为 30s
```

### 设置 IPVS 参数

IPVS 规则可通过如下注解控制：

```yaml
eks.tke.cloud.tencent.com/ipvs-scheduler: 'sh' # 调度算法，sh 是 source hash，按源地址 hash 进行转发，更利于分布式全局的负载均衡。默认为 rr (轮询 round robin)
eks.tke.cloud.tencent.com/ipvs-sh-port: "true" # 按端口进行 source hash，仅在 ipvs-scheduler 为 sh 有效。
eks.tke.cloud.tencent.com/ipvs-sync-period: '30s' # 规则刷新的最大间隔，默认 30s 刷新一次。
eks.tke.cloud.tencent.com/ipvs-min-sync-period: '2s' # 规则刷新的最小间隔，默认 service 一有变更就刷新。调整此参数可避免刷新过于频繁。
```

## 参考资料

* [EKS Annotation 官方说明文档](https://cloud.tencent.com/document/product/457/44173)
* [EKS 全局配置说明](https://cloud.tencent.com/document/product/457/71915)
* [EKS 镜像缓存](https://cloud.tencent.com/document/product/457/65908)
