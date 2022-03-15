# 节点 Crash 与 Vmcore 分析

本文介绍节点 Crash 后如何分析 vmcore 进行排查。

## kdump 介绍

目前大多 Linux 发新版都会默认开启 kdump 服务，以方便在内核崩溃的时候, 可以通过 kdump 服务提供的 kexec 机制快速的启用保留在内存中的第二个内核来收集并转储内核崩溃的日志信息(`vmcore` 等文件), 这种机制需要服务器硬件特性的支持, 不过现今常用的服务器系列均已支持.

如果没有特别配置 kdump，当发生 crash 时，通常默认会将 vmcore 保存到 `/var/crash` 路径下，也可以查看 `/etc/kdump.conf` 配置来确认:

```bash
$ grep ^path /etc/kdump.conf
path /var/crash
```

## 快速查看原因

在需要快速了解崩溃原因的时候, 可以简单查看崩溃主机(如果重启成功)的 `vmcore-dmesg.txt` 文件, 该文件列出了内核崩溃时的堆栈信息, 有助于我们大致了解崩溃的原因, 方便处理措施的决断. 如下所示为生成的日志文件通常的路径:

```txt
/var/crash/127.0.0.1-2019-11-11-08:40:08/vmcore-dmesg.txt
```

## 参考资料

* [Linux 系统内核崩溃分析处理简介](https://blog.arstercz.com/brief-intro-to-linux-kernel-crash-analyze/)
* [Kernel crash dump guide](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/kernel_administration_guide/kernel_crash_dump_guide)
* [Using kdump and kexec with the Red Hat Enterprise Linux for Real Time Kernel](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux_for_real_time/7/html/tuning_guide/using_kdump_and_kexec_with_the_rt_kernel)