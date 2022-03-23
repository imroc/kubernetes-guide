# 高并发实践

本文整理在 K8S 环境中的高并发性能调优实践。一些涉及到内核参数的调整，关于如何调整 Pod 内核参数的方法请参考 [为 Pod 设置内核参数](../../trick/deploy/set-sysctl.md)。

## TIME_WAIT 复用

如果短连接并发量较高，它所在 netns 中 TIME_WAIT 状态的连接就比较多，而 TIME_WAIT 连接默认要等 2MSL 时长才释放，长时间占用源端口，当这种状态连接数量累积到超过一定量之后可能会导致无法新建连接。

所以建议开启 TIME_WAIT 复用，即允许将 TIME_WAIT 连接重新用于新的 TCP 连接

```bash
sysctl -w net.ipv4.tcp_tw_reuse=1
```

> 在高版本内核中，`net.ipv4.tcp_tw_reuse` 默认值为 2，表示仅为回环地址开启复用，基本可以粗略的认为没开启复用。

## 扩大源端口范围

高并发场景，对于 client 来说会使用大量源端口，源端口范围从 `net.ipv4.ip_local_port_range` 这个内核参数中定义的区间随机选取，在高并发环境下，端口范围小容易导致源端口耗尽，使得部分连接异常。通常 Pod 源端口范围默认是 32768-60999，建议将其扩大，调整为 1024-65535: `sysctl -w net.ipv4.ip_local_port_range="1024 65535"`。

## 调大最大文件句柄数

在 linux 中，每个连接都会占用一个文件句柄，所以句柄数量限制同样也会限制最大连接数， 对于像 Nginx 这样的反向代理，对于每个请求，它会与 client 和 upstream server 分别建立一个连接，即占据两个文件句柄，所以理论上来说 Nginx 能同时处理的连接数最多是系统最大文件句柄数限制的一半。

系统最大文件句柄数由 `fs.file-max` 这个内核参数来控制，一些环境默认值可能为 838860，建议调大:

```bash
sysctl -w fs.file-max=1048576
```

## 调大连接队列的大小

进程监听的 socket 的连接队列最大的大小受限于内核参数 `net.core.somaxconn`，在高并发环境下，如果队列过小，可能导致队列溢出，使得连接部分连接无法建立。可以考虑将其改到 `65535`:

```bash
sysctl -w net.core.somaxconn=65535
```

如何查看队列大小来验证是否成功调整队列大小？可以执行 `ss -lnt` 看 `Send-Q` 的值。

高并发环境可以要调大 `somaxconn` 的值，但并不一定是调大了就意味着应用监听 socket 的连接队列就变大了。进程调用 listen 系统调用来监听端口的时候，还会传入一个 backlog 的参数，这个参数决定 socket 的连接队列大小，其值不得大于 `somaxconn` 的取值。

Go 程序标准库在 listen 时，默认直接读取 somaxconn 作为队列大小，所以通常 Go 程序的 socket 连接队列大小基本等于 somaxconn 的值。

Nginx 在监听 socket 时没有读取 somaxconn，而是有自己单独的参数配置。在 `nginx.conf` 中 listen 端口的位置，还有个叫 backlog 参数可以设置，它会决定 nginx listen 的端口的连接队列大小。

``` nginx.conf
server {
    listen  80  backlog=1024;
    ...
```

如果不设置，backlog 在 linux 上默认为 511:

```
backlog=number
   sets the backlog parameter in the listen() call that limits the maximum length for the queue of pending connections. By default, backlog is set to -1 on FreeBSD, DragonFly BSD, and macOS, and to 511 on other platforms.
```

也就是说，即便你的 somaxconn 配的很高，nginx 所监听端口的连接队列最大却也只有 511，高并发场景下可能导致连接队列溢出。

不过这个在 Nginx Ingress 情况又不太一样，因为 Nginx Ingress Controller 会自动读取 somaxconn 的值作为 backlog 参数写到生成的 nginx.conf 中: https://github.com/kubernetes/ingress-nginx/blob/controller-v0.34.1/internal/ingress/controller/nginx.go#L592

## 内核参数调优配置示例

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
```