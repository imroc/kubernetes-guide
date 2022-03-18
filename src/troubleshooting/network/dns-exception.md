# 排查 DNS 解析异常

## 排查思路

### 确保集群 DNS 正常运行

容器内解析 DNS 走的集群 DNS(通常是 CoreDNS)，所以首先要确保集群 DNS 运行正常。

kubelet 启动参数 `--cluster-dns` 可以看到 dns 服务的 cluster ip:

```bash
$ ps -ef | grep kubelet
... /usr/bin/kubelet --cluster-dns=172.16.14.217 ...
```

找到 dns 的 service:

```bash
$ kubectl get svc -n kube-system | grep 172.16.14.217
kube-dns              ClusterIP   172.16.14.217   <none>        53/TCP,53/UDP              47d
```

看是否存在 endpoint:

```bash
$ kubectl -n kube-system describe svc kube-dns | grep -i endpoints
Endpoints:         172.16.0.156:53,172.16.0.167:53
Endpoints:         172.16.0.156:53,172.16.0.167:53
```

检查 endpoint 的 对应 pod 是否正常:

```bash
$ kubectl -n kube-system get pod -o wide | grep 172.16.0.156
kube-dns-898dbbfc6-hvwlr            3/3       Running   0          8d        172.16.0.156   10.0.0.3
```

### 确保 Pod 能与集群 DNS 通信

检查下 pod 是否能连上集群 dns，可以在 pod 里 telnet 一下 dns 的 53 端口:

```bash
# 连 dns service 的 cluster ip
$ telnet 172.16.14.217 53
```

> 如果容器内没有 telnet 等测试工具，可以 [使用 nsenter 进入 netns](../skill/network/enter-netns-with-nsenter.md)，然后利用宿主机上的 telnet 进行测试。

如果检查到是网络不通，就需要排查下网络设置:

* 检查节点的安全组设置，需要放开集群的容器网段。
* 检查是否还有防火墙规则，检查 iptables。
* 检查 kube-proxy 是否正常运行，集群 DNS 的 IP 是 cluster ip，会经过 kube-proxy 生成的 iptables 或 ipvs 规则进行转发。

### 抓包

如果前面检查都没问题，可以考虑抓包看下，如果好复现，可以直接  [使用 nsenter 进入 netns](../skill/network/enter-netns-with-nsenter.md) 抓容器内的包:

```bash
tcpdump -i any port 53 -w dns.pcap
# tcpdump -i any port 53 -nn -tttt
```

如果还不能分析出来，就在请求链路上的多个点一起抓，比如 Pod 的容器内、宿主机cbr0网桥、宿主机主网卡(eth0)、coredns pod 所在宿主机主网卡、cbr0 以及容器内。等复现拉通对比分析，看看包在哪个点丢的。

## 现象与可能原因

### 5 秒延时

如果DNS查询经常延时5秒才返回，通常是遇到内核 conntrack 冲突导致的丢包，详见 [排障案例: DNS 5秒延时](../cases/network/dns-lookup-5s-delay.md)

### 解析外部域名超时

可能原因:

* 上游 DNS 故障。
* 上游 DNS 的 ACL 或防火墙拦截了报文。

### 所有解析都超时

如果集群内某个 Pod 不管解析 Service 还是外部域名都失败，通常是 Pod 与集群 DNS 之间通信有问题。

可能原因:

* 节点防火墙没放开集群网段，导致如果 Pod 跟集群 DNS 的 Pod 不在同一个节点就无法通信，DNS 请求也就无法被收到。
* kube-proxy 异常。
