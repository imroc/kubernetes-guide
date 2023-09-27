# 节点高负载

Kubernetes 节点高负载如何排查？本文来盘一盘。

## 如何判断节点高负载？

可以通过 `top` 或 `uptime` 来确定 load 大小，如果 load 小于 CPU 数量，属于低负载，如果大于 CPU 数量 2~3 倍，就比较高了，当然也看业务敏感程度，不太敏感的大于 4 倍算高负载。

## 排查思路

观察监控：通常不是因为内核 bug 导致的高负载，在卡死之前从监控一般能看出一些问题，可以观察下各项监控指标。

排查现场：如果没有相关监控或监控维度较少不足以查出问题，就尝试登录节点抓现场分析。有时负载过高通常使用 ssh 登录不上，如果可以用 vnc，可以尝试下使用 vnc 登录。

## 排查现场思路

loadavg 可以认为是 R状态线程数和D状态线程数的总和 （R 代表需要 cpu，是 cpu 负载。 D 通常代表需要 IO，是 IO 负载）

简单判断办法：

```bash
ps -eL -o lwp,pid,ppid,state,comm | grep -E " R | D "
```

然后数一下各种状态多少个进程，看看是 D 住还是 R。

如果是长时间 D 住，可以进一步查看进程堆栈看看 D 在哪里:

```bash
cat /proc/<PID>/stack
```

如果是大量进程/线程在 R 状态，那就是同时需要 CPU 的进程/线程数过多，CPU 忙不过来了，可以利用 perf 分析程序在忙什么:

```bash
perf -p <PID>
```

## 线程数量过多

如果 load 高但 CPU 利用率不高，通常是同时 running 的进程/线程数过多，排队等 CPU 切换的进程/线程较多。

通常在 load 高时执行任何命令都会非常卡，因为执行这些命令也都意味着要创建和执行新的进程，所以下面排查过程中执行命令时需要耐心等待。

看系统中可创建的进程数实际值:

```bash
cat /proc/sys/kernel/pid_max
```

> 修改方式: sysctl -w  kernel.pid_max=65535

通过以下命令统计当前 PID 数量:

```bash
ps -eLf | wc -l
```

如果数量过多，可以大致扫下有哪些进程，如果有大量重复启动命令的进程，就可能是这个进程对应程序的 bug 导致。

还可以通过以下命令统计线程数排名:

```bash
printf "NUM\tPID\tCOMMAND\n" && ps -eLf | awk '{$1=null;$3=null;$4=null;$5=null;$6=null;$7=null;$8=null;$9=null;print}' | sort |uniq -c |sort -rn | head -10
```

找出线程数量较多的进程，可能就是某个容器的线程泄漏，导致 PID 耗尽。

随便取其中一个 PID，用 nsenter 进入进程 netns:

```bash
nsenter -n --target <PID>
```

然后执行 `ip a` 看下 IP 地址，如果不是节点 IP，通常就是 Pod IP，可以通过 `kubectl get pod -o wide -A | grep <IP>` 来反查进程来自哪个 Pod。

## 陷入内核态过久

有些时候某些 CPU 可能会执行耗时较长的内核态任务，比如大量创建/销毁进程，回收内存，需要较长时间 reclaim memory，必须要执行完才能切回用户态，虽然内核一般会有 migration 内核线程将这种负载较高的核上的任务迁移到其它核上，但也只能适当缓解，如果这种任务较多，整体的 CPU system 占用就会较高，影响到用户态进程任务的执行，对于业务来说，就是 CPU 不够用，处理就变慢，发生超时。

CPU 内核态占用的 Prometheus 查询语句:
```txt
sum(irate(node_cpu_seconds_total{instance="10.10.1.14",mode="system"}[2m]))
```

## IO 高负载

参考 [IO 高负载](io-high-load.md) 进行排查。

## FAQ

### 如果机器完全无法操作怎么办？

有时候高负载是无法 ssh 登录的，即使通过 vnc 方式登录成功，由于机器太卡也是执行不了任何命令。如通过监控也看不出任何原因，又想要彻查根因，可以从虚拟化底层入手，给虚拟机发信号触发 coredump (无需登录虚拟机)，如果用的云产品，可以提工单让虚拟主机的产品售后来排查分析。

