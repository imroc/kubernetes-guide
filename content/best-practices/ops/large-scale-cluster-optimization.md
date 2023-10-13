# 大规模集群优化

Kubernetes 自 v1.6 以来，官方就宣称单集群最大支持 5000 个节点。不过这只是理论上，在具体实践中从 0 到 5000，还是有很长的路要走，需要见招拆招。

官方标准如下：

* 不超过 5000 个节点
* 不超过 150000 个 pod
* 不超过 300000 个容器
* 每个节点不超过 100 个 pod

## Master 节点配置优化

GCE 推荐配置：

* 1-5 节点: n1-standard-1
* 6-10 节点: n1-standard-2
* 11-100 节点: n1-standard-4
* 101-250 节点: n1-standard-8
* 251-500 节点: n1-standard-16
* 超过 500 节点: n1-standard-32

AWS 推荐配置：

* 1-5 节点: m3.medium
* 6-10 节点: m3.large
* 11-100 节点: m3.xlarge
* 101-250 节点: m3.2xlarge
* 251-500 节点: c4.4xlarge
* 超过 500 节点: c4.8xlarge

对应 CPU 和内存为：

* 1-5 节点: 1vCPU 3.75G内存
* 6-10 节点: 2vCPU 7.5G内存
* 11-100 节点: 4vCPU 15G内存
* 101-250 节点: 8vCPU 30G内存
* 251-500 节点: 16vCPU 60G内存
* 超过 500 节点: 32vCPU 120G内存

## kube-apiserver 优化

### 高可用

* 方式一: 启动多个 kube-apiserver 实例通过外部 LB 做负载均衡。
* 方式二: 设置 `--apiserver-count` 和 `--endpoint-reconciler-type`，可使得多个 kube-apiserver 实例加入到 Kubernetes Service 的 endpoints 中，从而实现高可用。

不过由于 TLS 会复用连接，所以上述两种方式都无法做到真正的负载均衡。为了解决这个问题，可以在服务端实现限流器，在请求达到阀值时告知客户端退避或拒绝连接，客户端则配合实现相应负载切换机制。

### 控制连接数

kube-apiserver 以下两个参数可以控制连接数:

``` bash
--max-mutating-requests-inflight int           The maximum number of mutating requests in flight at a given time. When the server exceeds this, it rejects requests. Zero for no limit. (default 200)
--max-requests-inflight int                    The maximum number of non-mutating requests in flight at a given time. When the server exceeds this, it rejects requests. Zero for no limit. (default 400)
```

节点数量在 1000 - 3000 之间时，推荐：

``` bash
--max-requests-inflight=1500
--max-mutating-requests-inflight=500
```

节点数量大于 3000 时，推荐：

``` bash
--max-requests-inflight=3000
--max-mutating-requests-inflight=1000
```

## kube-scheduler 与 kube-controller-manager 优化

### 高可用

kube-controller-manager 和 kube-scheduler 是通过 leader election 实现高可用，启用时需要添加以下参数:

``` bash
--leader-elect=true
--leader-elect-lease-duration=15s
--leader-elect-renew-deadline=10s
--leader-elect-resource-lock=endpoints
--leader-elect-retry-period=2s
```

### 控制 QPS

与 kube-apiserver 通信的 qps 限制，推荐为：

``` bash
--kube-api-qps=100
```

## Kubelet 优化

* 设置 `--image-pull-progress-deadline=30m`
* 设置 `--serialize-image-pulls=false`（需要 Docker 使用 overlay2 ）
* Kubelet 单节点允许运行的最大 Pod 数：`--max-pods=110`（默认是 110，可以根据实际需要设置）

## 集群 DNS 高可用

设置反亲和，让集群 DNS (kube-dns 或 coredns) 分散在不同节点，避免单点故障:

``` yaml
affinity:
 podAntiAffinity:
   requiredDuringSchedulingIgnoredDuringExecution:
   - weight: 100
     labelSelector:
       matchExpressions:
       - key: k8s-app
         operator: In
         values:
         - kube-dns
     topologyKey: kubernetes.io/hostname
```

## ETCD 优化

参考 [ETCD 优化](etcd-optimization.md)

## 参考资料

* [Considerations for large clusters](https://kubernetes.io/docs/setup/best-practices/cluster-large/)