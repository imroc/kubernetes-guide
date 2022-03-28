# Linux 常用排查命令

## 查看监听队列

```bash
$ ss -lnt
State      Recv-Q Send-Q Local Address:Port                Peer Address:Port
LISTEN     129    128                *:80                             *:*
```

## 查看网络计数器

```bash
$ netstat -az
...
TcpExtListenOverflows           12178939              0.0
TcpExtListenDrops               12247395              0.0
...
```

```bash
netstat -s | grep -E 'drop|overflow'
```

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
