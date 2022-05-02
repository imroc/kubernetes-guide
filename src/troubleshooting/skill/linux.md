# Linux 常用排查命令

## 查看 socket buffer

查看是否阻塞:

```bash
$ netstat -antup | awk '{if($2>100||$3>100){print $0}}'
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp     2066     36 9.134.55.160:8000       10.35.16.97:63005       ESTABLISHED 1826655/nginx
```

* `Recv-Q` 是接收队列，如果持续有堆积，可能是高负载，应用处理不过来，也可能是程序的 bug，卡住了，导致没有从 buffer 中取数据，可以看看对应 pid 的 stack 卡在哪里了(`cat /proc/$PID/stack`)。

查看是否有 UDP buffer 满导致丢包:

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

对于 TCP，发送 buffer 慢不会导致丢包，只是会让程序发送数据包时卡住，等待缓冲区有足够空间释放出来，而接收 buffer 满了会导致丢包，可以通过计数器查看:

```bash
$ nstat -az | grep TcpExtTCPRcvQDrop
TcpExtTCPRcvQDrop               264324                  0.0
```

查看当前 UDP buffer 的情况:

```bash
$ ss -nump
Recv-Q    Send-Q          Local Address:Port         Peer Address:Port    Process
0         0             10.10.4.26%eth0:68              10.10.4.1:67       users:(("NetworkManager",pid=960,fd=22))
     skmem:(r0,rb212992,t0,tb212992,f0,w0,o640,bl0,d0)
```

* rb212992 表示 UDP 接收缓冲区大小是 212992 字节，tb212992 表示 UDP 发送缓存区大小是 212992 字节。
* Recv-Q 和 Send-Q 分别表示当前接收和发送缓冲区中的数据包字节数。

查看当前 TCP buffer 的情况:

```bash
$ ss -ntmp
ESTAB        0             0                    [::ffff:109.244.190.163]:9988                       [::ffff:10.10.4.26]:54440         users:(("xray",pid=3603,fd=20))
     skmem:(r0,rb12582912,t0,tb12582912,f0,w0,o0,bl0,d0)
```

* rb12582912 表示 TCP 接收缓冲区大小是 12582912 字节，tb12582912 表示 TCP 发送缓存区大小是 12582912 字节。
* Recv-Q 和 Send-Q 分别表示当前接收和发送缓冲区中的数据包字节数。

## 查看监听队列

```bash
$ ss -lnt
State      Recv-Q Send-Q Local Address:Port                Peer Address:Port
LISTEN     129    128                *:80                             *:*
```

> `Recv-Q` 表示 accept queue 中的连接数，如果满了(`Recv-Q`的值比`Send-Q`大1)，要么是并发太大，或负载太高，程序处理不过来；要么是程序 bug，卡住了，导致没有从 accept queue 中取连接，可以看看对应 pid 的 stack 卡在哪里了(`cat /proc/$PID/stack`)。

## 查看网络计数器

```bash
$ nstat -az
...
TcpExtListenOverflows           12178939              0.0
TcpExtListenDrops               12247395              0.0
...
```

```bash
netstat -s | grep -E 'drop|overflow'
```

> 如果有 overflow，意味着 accept queue 有满过，可以查看监听队列看是否有现场。

## 查看 conntrack

```bash
$ conntrack -S
cpu=0   	found=770 invalid=3856 ignore=42570125 insert=0 insert_failed=0 drop=0 early_drop=0 error=0 search_restart=746284
cpu=1   	found=784 invalid=3647 ignore=41988392 insert=0 insert_failed=0 drop=0 early_drop=0 error=0 search_restart=718963
cpu=2   	found=25588 invalid=71264 ignore=243330690 insert=0 insert_failed=0 drop=0 early_drop=0 error=0 search_restart=2319295
cpu=3   	found=25706 invalid=70168 ignore=242616824 insert=0 insert_failed=0 drop=0 early_drop=0 error=18 search_restart=2320376
```

* 若有 `insert_failed`，表示存在 conntrack 插入失败，会导致丢包。

## 查看连接数

如果有 ss 命令，可以使用 `ss -s` 统计:

```bash
$ ss -s
Total: 470
TCP:   220 (estab 47, closed 150, orphaned 0, timewait 71)

Transport Total     IP        IPv6
RAW	  0         0         0
UDP	  63        60        3
TCP	  70        55        15
INET	  133       115       18
FRAG	  0         0         0
```

如果没有 `ss`，也可以尝试用脚本统计当前各种状态的 TCP 连接数:

```bash
netstat -n | awk '/^tcp/ {++S[$NF]} END {for(a in S) print a, S[a]}'
```

示例输出:

```txt
ESTABLISHED 18
TIME_WAIT 457
```

或者直接手动统计 `/proc`:

```bash
cat /proc/net/tcp* | wc -l
```

## 测试网络连通性

不断 telnet 查看网络是否能通:

```bash
while true; do echo "" | telnet 10.0.0.3 443; sleep 0.1; done
```

* `ctrl+c` 终止测试
* 替换 `10.0.0.3` 与 `443` 为需要测试的 IP/域名 和端口

没有安装 telnet，也可以使用 nc 测试:

```bash
$ nc -vz 10.0.0.3 443
```

## 排查流量激增

### iftop 纠出大流量 IP

```bash
$ iftop
10.21.45.8  => 10.111.100.101  3.35Mb  2.92Mb  2.94Mb
            <=                  194Mb   160Mb   162Mb
10.21.45.8  => 10.121.101.22   3.41Mb  2.89Mb  3.04Mb
            <=                  192Mb   159Mb   172Mb
10.21.45.8  => 10.22.122.55     279Kb   313Kb   292Kb
            <=                 11.3Kb  12.1Kb  11.9Kb
...
```

### netstat 查看大流量 IP 连接

```bash
$ netstat -np | grep 10.121.101.22
tcp        0      0 10.21.45.8:48320        10.121.101.22:12002     TIME_WAIT   -                   
tcp        0      0 10.21.45.8:59179        10.121.101.22:12002     TIME_WAIT   -                   
tcp        0      0 10.21.45.8:55835        10.121.101.22:12002     TIME_WAIT   -                   
tcp        0      0 10.21.45.8:49420        10.121.101.22:12002     TIME_WAIT   -                   
tcp        0      0 10.21.45.8:55559        10.121.101.22:12002     TIME_WAIT   -                   
...
```

## 排查资源占用

### 文件被占用

看某个文件在被哪些进程读写:

```bash
lsof <文件名>
```

看某个进程打开了哪些文件:

```bash
lsof -p <pid>
```

### 端口占用

查看 22 端口被谁占用:

```bash
lsof -i :22
```

```bash
netstat -tunlp | grep 22
```

## 查看进程树

```bash
$ pstree -apnhs 3356537
systemd,1 --switched-root --system --deserialize 22
  └─containerd,3895
      └─{containerd},3356537
```

## 测试对比 CPU 性能

看计算圆周率耗时，耗时越短说明 CPU 性能越强:

```bash
time echo "scale=5000; 4*a(1)"| bc -l -q
```

## 查看证书内容

查看 secret 里的证书内容:

```bash
kubectl get secret test-crt-secret  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

查看证书文件内容:

```bash
openssl x509 -noout -text -in test.crt
```

查看远程地址的证书内容:

```bash
echo | openssl s_client -connect imroc.cc:443 2>/dev/null | openssl x509 -noout -text
```