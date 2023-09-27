# PID 爆满

## 如何判断 PID 耗尽

首先要确认当前的 PID 限制，检查全局 PID 最大限制:

``` bash
cat /proc/sys/kernel/pid_max
```

也检查下线程数限制：

``` bash
cat /proc/sys/kernel/threads-max
```

再检查下当前用户是否还有 `ulimit` 限制最大进程数。

确认当前实际 PID 数量，检查当前用户的 PID 数量:

``` bash
ps -eLf | wc -l
```

如果发现实际 PID 数量接近最大限制说明 PID 就可能会爆满导致经常有进程无法启动，低版本内核可能报错: `Cannot allocate memory`，这个报错信息不准确，在内核 4.1 以后改进了: https://github.com/torvalds/linux/commit/35f71bc0a09a45924bed268d8ccd0d3407bc476f

## 如何解决

临时调大 PID 和线程数限制：

``` bash
echo 65535 > /proc/sys/kernel/pid_max
echo 65535 > /proc/sys/kernel/threads-max
```

永久调大 PID 和线程数限制:

``` bash
echo "kernel.pid_max=65535 " >> /etc/sysctl.conf && sysctl -p
echo "kernel.threads-max=65535 " >> /etc/sysctl.conf && sysctl -p
```

k8s 1.14 支持了限制 Pod 的进程数量: https://kubernetes.io/blog/2019/04/15/process-id-limiting-for-stability-improvements-in-kubernetes-1.14/
