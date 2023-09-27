# 排查网络丢包

本文汇总网络丢包相关问题的排查思路与可能原因。

## 网络丢包的定义与现象

网络丢包是指部分包正常，部分包被丢弃。

从现象上看就不是网络一直不通，而是:
1. 偶尔不通。
2. 速度慢(丢包导致重传)。

## 排查思路

TODO

### 可能原因

### 高并发 NAT 导致 conntrack 插入冲突

如果高并发并且做了 NAT，比如使用了 ip-masq-agent，对集群外的网段或公网进行 SNAT，又或者集群内访问 Service 被做了 DNAT，再加上高并发的话，内核就会高并发进行 NAT 和 conntrack 插入，当并发 NAT 后五元组冲突，最终插入的时候只有先插入的那个成功，另外冲突的就会插入失败，然后就丢包了。

可以通过 `conntrack -S` 确认，如果 `insert_failed` 计数在增加，说明有 conntrack 插入冲突。

### conntrack 表爆满

看内核日志:

``` bash
# demsg
$ journalctl -k | grep "nf_conntrack: table full"
nf_conntrack: nf_conntrack: table full, dropping packet
```

若有以上报错，证明 conntrack 表满了，需要调大 conntrack 表:

``` bash
sysctl -w net.netfilter.nf_conntrack_max=1000000
```

### socket buffer 满导致丢包

`netstat -s | grep "buffer errors"` 的计数统计在增加，说明流量较大，socket buffer 不够用，需要调大下 buffer 容量:

```bash
net.ipv4.tcp_wmem = 4096        16384   4194304
net.ipv4.tcp_rmem = 4096        87380   6291456
net.ipv4.tcp_mem = 381462       508616  762924
net.core.rmem_default = 8388608
net.core.rmem_max = 26214400
net.core.wmem_max = 26214400
```

### arp 表爆满

看内核日志:

``` bash
# demsg
$ journalctl -k | grep "neighbor table overflow"
arp_cache: neighbor table overflow!
```

若有以上报错，证明 arp 表满了，查看当前 arp 记录数:

``` bash
$ arp -an | wc -l
1335
```

查看 arp gc 阀值:

``` bash
$ sysctl -a | grep gc_thresh
net.ipv4.neigh.default.gc_thresh1 = 128
net.ipv4.neigh.default.gc_thresh2 = 512
net.ipv4.neigh.default.gc_thresh3 = 1024
```

调大 arp 表:
``` bash
sysctl -w net.ipv4.neigh.default.gc_thresh1=80000
sysctl -w net.ipv4.neigh.default.gc_thresh2=90000
sysctl -w net.ipv4.neigh.default.gc_thresh3=100000
```

更多请参考 [节点排障: Arp 表爆满](../node/arp-cache-overflow.md)。

### MTU 不一致导致丢包

如果容器内网卡 MTU 比另一端宿主机内的网卡 MTU 不一致(通常是 CNI 插件问题)，数据包就可能被截断导致一些数据丢失:
1. 如果容器内的 MTU 更大，发出去的包如果超过 MTU 可能就被丢弃了(通常节点内核不会像交换机那样严谨会分片发送)。
2. 同样的，如果容器内的 MTU 更小，进来的包如果超过 MTU 可能就被丢弃。

> tcp 协商 mss 的时候，主要看的是进程通信两端网卡的 MTU。

MTU 大小可以通过 `ip address show` 或 `ifconfig` 来确认。

### QoS 限流丢包

在云厂商的云主机环境，有可能会在底层会对某些包进行 QoS 限流，比如为了防止公共 DNS 被 DDoS 攻击，限制 UDP 53 端口的包的流量，超过特定速度阈值就丢包，导致部分 DNS 请求丢包而超时。

### PPS 限速对包

网卡的速度始终是有上限的，在云环境下，不同机型不同规格的云主机的 PPS 上限也不一样，超过阈值后就不保证能正常转发，可能就丢包了。

### 连接队列满导致丢包

对于 TCP 连接，三次握手建立连接，没建连成功前存储在半连接队列，建连成功但还没被应用层 accept 之前，存储在全连接队列。队列大小是有上限的，如果慢了就会丢包：
* 如果并发太高或机器负载过高，半连接队列可能会满，新来的 SYN 建连包会被丢包。
* 如果应用层 accept 连接过慢，会导致全连接队列堆积，满了就会丢包，通常是并发高、机器负载高或应用 hung 死等原因。

查看丢包统计:

```bash
netstat -s | grep -E 'drop|overflow'
```

```bash
$ cat /proc/net/netstat | awk '/TcpExt/ { print $21,$22 }'
ListenOverlows ListenDrops
20168 20168
```

> 不同内核版本的列号可能有差别

如果有现场，还可以观察全连接队列阻塞情况 (`Rec-Q`):

```bash
ss -lnt
```

通过以下内核参数可以调整队列大小 (namespace隔离):

```bash
net.ipv4.tcp_max_syn_backlog = 8096 # 调整半连接队列上限
net.core.somaxconn = 32768 # 调整全连接队列上限
```

需要注意的是，`somaxconn` 只是调整了队列最大的上限，但实际队列大小是应用在 `listen` 时传入的 `backlog` 大小，大多编程语言默认会自动读取 `somaxconn` 的值作为 `listen` 系统调用的 `backlog` 参数的大小。

如果是用 nginx，`backlog` 的值需要在 `nginx.conf` 配置中显示指定，否则会用它自己的默认值 `511`。

### 源端口耗尽

当作为 client 发请求，或外部流量从 NodePort 进来时进行 SNAT，会从当前 netns 中选择一个端口作为源端口，端口范围由 `net.ipv4.ip_local_port_range` 这个内核参数决定，如果并发量大，就可能导致源端口耗尽，从而丢包。

### tcp_tw_recycle 导致丢包

在低版本内核中(比如 3.10)，支持使用 tcp_tw_recycle 内核参数来开启 TIME_WAIT 的快速回收，但如果 client 也开启了 timestamp (一般默认开启)，同时也就会导致在 NAT 环境丢包，甚至没有 NAT 时，稍微高并发一点，也会导致 PAWS 校验失败，导致丢包:

``` bash
# 看 SYN 丢包是否全都是 PAWS 校验失败
$ cat /proc/net/netstat | grep TcpE| awk '{print $15, $22}'
PAWSPassive ListenDrops
96305 96305
```

参考资料:

* https://github.com/torvalds/linux/blob/v3.10/net/ipv4/tcp_ipv4.c#L1465
* https://www.freesoft.org/CIE/RFC/1323/13.htm
* https://zhuanlan.zhihu.com/p/35684094
* https://my.oschina.net/u/4270811/blog/3473655/print

### listen 了源 port_range 范围内的端口

比如 `net.ipv4.ip_local_port_range="1024 65535"`，但又 listen 了 `9100` 端口，当作为 client 发请求时，选择一个 port_range 范围内的端口作为源端口，就可能选到 9100，但这个端口已经被 listen 了，就可能会选取失败，导致丢包。
