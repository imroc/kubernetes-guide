# 网络性能调优

本文整理在 K8S 环境中的网络性能调优实践。一些涉及到内核参数的调整，关于如何调整 Pod 内核参数的方法请参考 [为 Pod 设置内核参数](../../trick/deploy/set-sysctl.md)。

## 高并发场景

### TIME_WAIT 连接复用

如果短连接并发量较高，它所在 netns 中 TIME_WAIT 状态的连接就比较多，而 TIME_WAIT 连接默认要等 2MSL 时长才释放，长时间占用源端口，当这种状态连接数量累积到超过一定量之后可能会导致无法新建连接。

所以建议开启 TIME_WAIT 复用，即允许将 TIME_WAIT 连接重新用于新的 TCP 连接:

```bash
net.ipv4.tcp_tw_reuse=1
```

> 在高版本内核中，`net.ipv4.tcp_tw_reuse` 默认值为 2，表示仅为回环地址开启复用，基本可以粗略的认为没开启复用。

### 扩大源端口范围

高并发场景，对于 client 来说会使用大量源端口，源端口范围从 `net.ipv4.ip_local_port_range` 这个内核参数中定义的区间随机选取，在高并发环境下，端口范围小容易导致源端口耗尽，使得部分连接异常。通常 Pod 源端口范围默认是 32768-60999，建议将其扩大，调整为 1024-65535: `sysctl -w net.ipv4.ip_local_port_range="1024 65535"`。

### 调大最大文件句柄数

在 linux 中，每个连接都会占用一个文件句柄，所以句柄数量限制同样也会限制最大连接数， 对于像 Nginx 这样的反向代理，对于每个请求，它会与 client 和 upstream server 分别建立一个连接，即占据两个文件句柄，所以理论上来说 Nginx 能同时处理的连接数最多是系统最大文件句柄数限制的一半。

系统最大文件句柄数由 `fs.file-max` 这个内核参数来控制，一些环境默认值可能为 838860，建议调大:

```bash
fs.file-max=1048576
```

### 调大全连接连接队列的大小

TCP 全连接队列的长度如果过小，在高并发环境可能导致队列溢出，使得部分连接无法建立。

如果因全连接队列溢出导致了丢包，从统计的计数上是可以看出来的：

```bash
# 用 netstat 查看统计
$ netstat -s | grep -E 'overflow|drop'
    12178939 times the listen queue of a socket overflowed
    12247395 SYNs to LISTEN sockets dropped
    
# 也可以用 nstat 查看计数器
$ nstat -az | grep -E 'TcpExtListenOverflows|TcpExtListenDrops'
TcpExtListenOverflows           12178939              0.0
TcpExtListenDrops               12247395              0.0
```

全连接队列的大小取决于 `net.core.somaxconn` 内核参数以及业务进程调用 listen 时传入的 backlog 参数，取两者中的较小值(`min(backlog,somaxconn)`)，一些编程语言通常是默认取 `net.core.somaxconn` 参数的值作为 backlog 参数传入 listen 系统调用（比如Go语言）。

高并发环境可以考虑将其改到 `65535`:

```bash
sysctl -w net.core.somaxconn=65535
```

如何查看队列大小来验证是否成功调整队列大小？可以执行 `ss -lntp` 看 `Send-Q` 的值。

```bash
$ ss -lntp
State        Recv-Q       Send-Q             Local Address:Port             Peer Address:Port      Process
LISTEN       0            65535                    0.0.0.0:80                    0.0.0.0:*          users:(("nginx",pid=347916,fd=6),("nginx",pid=347915,fd=6),("nginx",pid=347887,fd=6))
```

> ss 用 -l 查看 LISTEN 状态连接时，`Recv-Q` 表示的当前已建连但还未被服务端调用 `accept()` 取走的连接数量，即全连接队列中的连接数；`Send-Q` 表示的则是最大的 listen backlog 数值，即全连接队列大小。如果 `Recv-Q` 大小接近 `Send-Q` 的大小时，说明连接队列可能溢出。

需要注意的是，Nginx 在 listen 时并没有读取 somaxconn 作为 backlog 参数传入，而是在 nginx 配置文件中有自己单独的参数配置:

```nginx.conf
server {
    listen  80  backlog=1024;
    ...
```

如果不设置，backlog 在 linux 上默认为 511:

```txt
backlog=number
   sets the backlog parameter in the listen() call that limits the maximum length for the queue of pending connections. By default, backlog is set to -1 on FreeBSD, DragonFly BSD, and macOS, and to 511 on other platforms.
```

也就是说，即便你的 `somaxconn` 配的很高，nginx 所监听端口的连接队列最大却也只有 511，高并发场景下还是可能导致连接队列溢出，所以建议配置下 nginx 的 backlog 参数。

不过如果用的是 Nginx Ingress ，情况又不太一样，因为 Nginx Ingress Controller 会自动读取 somaxconn 的值作为 backlog 参数写到生成的 `nginx.conf` 中，参考 [源码](https://github.com/kubernetes/ingress-nginx/blob/controller-v0.34.1/internal/ingress/controller/nginx.go#L592)。

## 高吞吐场景

### 调大 UDP 缓冲区

UDP socket 的发送和接收缓冲区是有上限的，如果缓冲区较小，高并发环境可能导致缓冲区满而丢包，从网络计数可以看出来:

```bash
# 使用 netstat 查看统计
$ netstat -s | grep "buffer errors"
    429469 receive buffer errors
    23568 send buffer errors
 
# 也可以用 nstat 查看计数器
$ nstat -az | grep -E 'UdpRcvbufErrors|UdpSndbufErrors'
UdpRcvbufErrors                 429469                 0.0
UdpSndbufErrors                 23568                  0.0
```

还可以使用 `ss -nump` 查看当前缓冲区的情况:

```bash
$ ss -nump
Recv-Q    Send-Q          Local Address:Port         Peer Address:Port    Process
0         0             10.10.4.26%eth0:68              10.10.4.1:67       users:(("NetworkManager",pid=960,fd=22))
	 skmem:(r0,rb212992,t0,tb212992,f0,w0,o640,bl0,d0)
```

> 1. `rb212992` 表示 UDP 接收缓冲区大小是 `212992` 字节，`tb212992` 表示 UDP 发送缓存区大小是 `212992` 字节。
> 2. `Recv-Q` 和 `Send-Q` 分别表示当前接收和发送缓冲区中的数据包字节数。

UDP 发送缓冲区大小取决于:
1. `net.core.wmem_default` 和 `net.core.wmem_max` 这两个内核参数，分别表示缓冲区的默认大小和最大上限。
2. 如果程序自己调用 `setsockopt`设置`SO_SNDBUF`来自定义缓冲区大小，最终取值不会超过 `net.core.wmem_max`；如果程序没设置，则会使用 `net.core.wmem_default` 作为缓冲区的大小。

同理，UDP 接收缓冲区大小取决于:
1. `net.core.rmem_default` 和 `net.core.rmem_max` 这两个内核参数，分别表示缓冲区的默认大小和最大上限。
2. 如果程序自己调用 `setsockopt`设置`SO_RCVBUF`来自定义缓冲区大小，最终取值不会超过 `net.core.rmem_max`；如果程序没设置，则会使用 `net.core.rmem_default` 作为缓冲区的大小。

需要注意的是，这些内核参数在容器网络命名空间中是无法设置的，是 Node 级别的参数，需要在节点上修改，建议修改值:

```bash
net.core.rmem_default=26214400 # socket receive buffer 默认值 (25M)，如果程序没用 setsockopt 更改 buffer 长度的话，默认用这个值。
net.core.wmem_default=26214400 # socket send buffer 默认值 (25M)，如果程序没用 setsockopt 更改 buffer 长度的话，默认用这个值。
net.core.rmem_max=26214400 # socket receive buffer 上限 (25M)，如果程序使用 setsockopt 更改 buffer 长度，最大不能超过此限制。
net.core.wmem_max=26214400 # socket send buffer 上限 (25M)，如果程序使用 setsockopt 更改 buffer 长度，最大不能超过此限制。
```

如果程序自己有调用 `setsockopt` 去设置 `SO_SNDBUF` 或 `SO_RCVBUF`，建议设置到跟前面内核参数对应的最大上限值。

### 调大 TCP 缓冲区

TCP socket 的发送和接收缓冲区也是有上限的，不过对于发送缓冲区，即便满了也是不会丢包的，只是会让程序发送数据包时卡住，等待缓冲区有足够空间释放出来，所以一般不需要优化发送缓冲区。

对于接收缓冲区，在高并发环境如果较小，可能导致缓冲区满而丢包，从网络计数可以看出来:

```bash
$ nstat -az | grep TcpExtTCPRcvQDrop
TcpExtTCPRcvQDrop               264324                  0.0
```

还可以使用 `ss -ntmp` 查看当前缓冲区情况:

```bash
$ ss -ntmp
ESTAB        0             0                    [::ffff:109.244.190.163]:9988                       [::ffff:10.10.4.26]:54440         users:(("xray",pid=3603,fd=20))
	 skmem:(r0,rb12582912,t0,tb12582912,f0,w0,o0,bl0,d0)
```

> 1. `rb12582912` 表示 TCP 接收缓冲区大小是 `12582912` 字节，`tb12582912` 表示 UDP 发送缓存区大小是 `12582912` 字节。
> 2. `Recv-Q` 和 `Send-Q` 分别表示当前接收和发送缓冲区中的数据包字节数。

如果存在 `net.ipv4.tcp_rmem` 这个参数，对于 TCP 而言，会覆盖 `net.core.rmem_default` 和 `net.core.rmem_max` 的值。这个参数网络命名空间隔离的，而在容器网络命名空间中，一般默认是有配置的，所以如果要调整 TCP 接收缓冲区，需要显式在 Pod 级别配置下内核参数:

```bash
net.ipv4.tcp_rmem="4096 26214400 26214400"
```

> 1. 单位是字节，分别是 min, default, max。
> 2. 如果程序没用 setsockopt 更改 buffer 长度，就会使用 default 作为初始 buffer 长度(覆盖 `net.core.rmem_default`)，然后根据内存压力在 min 和 max 之间自动调整。
> 3. 如果程序使用了 setsockopt 更改 buffer 长度，则使用传入的长度 (仍然受限于 `net.core.rmem_max`)。

## 选用高性能的机型

如果并发量或吞吐量较高，服务器的连接数、PPS 以及带宽能力的上限可能成为瓶颈，对于网络性能要求较高的业务，我们应选用高性能的机型作为节点部署业务。

如果使用云厂商的服务，一般会提供各种机型和规格的性能指标参考，比如腾讯云可以参考 [云服务器实例规格](https://cloud.tencent.com/document/product/213/11518)。

如果将业务部署到高性能机型的节点上？可以结合容器服务的节点池/节点组扩容出一组相同机型的节点，用亲和性或 nodeSelector 指定调度到这些节点上。

如果使用的是 [腾讯云弹性集群 EKS](https://console.cloud.tencent.com/tke2/ecluster) 这种没有节点的 Serverless 类型 K8S，可以在 Pod 级别加注解来指定调度的机型:

```yaml
eks.tke.cloud.tencent.com/cpu-type: "S6,C6,S5,C6,amd,intel"
```
> 注解说明请参考 [EKS Annotation 说明](https://cloud.tencent.com/document/product/457/44173)。

## 内核参数调优配置示例

调整 Pod 内核参数:

```yaml
      initContainers:
      - name: setsysctl
        image: busybox
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          sysctl -w net.core.somaxconn=65535
          sysctl -w net.ipv4.ip_local_port_range="1024 65535"
          sysctl -w net.ipv4.tcp_tw_reuse=1
          sysctl -w fs.file-max=1048576
          sysctl -w net.ipv4.tcp_rmem="4096 26214400 26214400"
```

调整节点内核参数(修改 `/etc/sysctl.conf` 并执行 `sysctl -p`):

```bash
net.core.rmem_default=26214400
net.core.wmem_default=26214400
net.core.rmem_max=26214400
net.core.wmem_max=26214400
```

如果使用的是 [腾讯云弹性集群 EKS](https://console.cloud.tencent.com/tke2/ecluster) 这种没有节点的 Serverless 类型 K8S(每个 Pod 都是独占虚拟机)，可以在 Pod 级别加如下注解来修改 Pod 对应虚拟机中的内核参数:

```yaml
eks.tke.cloud.tencent.com/host-sysctls: '[{"name": "net.core.rmem_max","value": "26214400"},{"name": "net.core.wmem_max","value": "26214400"},{"name": "net.core.rmem_default","value": "26214400"},{"name": "net.core.wmem_default","value": "26214400"}]'
```

## 参考资料

* [云服务器网络访问丢包](https://cloud.tencent.com/document/product/213/57336)