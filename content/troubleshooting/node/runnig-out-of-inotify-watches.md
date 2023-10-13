# inotify 资源耗尽 

## inotify 耗尽的危害

如果 inotify 资源耗尽，kubelet 创建容器将会失败:

```log
Failed to watch directory "/sys/fs/cgroup/blkio/system.slice": inotify_add_watch /sys/fs/cgroup/blkio/system.slice/var-lib-kubelet-pods-d111600d\x2dcdf2\x2d11e7\x2d8e6b\x2dfa163ebb68b9-volumes-kubernetes.io\x7esecret-etcd\x2dcerts.mount: no space left on device
```

## 查看 inotify watch 的限制

每个 linux 进程可以持有多个 fd，每个 inotify 类型的 fd 可以 watch 多个目录，每个用户下所有进程 inotify 类型的 fd 可以 watch 的总目录数有个最大限制，这个限制可以通过内核参数配置: `fs.inotify.max_user_watches`。

查看最大 inotify watch 数:

```bash
$ cat /proc/sys/fs/inotify/max_user_watches
8192
```

## 查看进程的 inotify watch 情况

使用下面的脚本查看当前有 inotify watch 类型 fd 的进程以及每个 fd watch 的目录数量，降序输出，带总数统计:

```bash
#!/usr/bin/env bash
#
# Copyright 2019 (c) roc
#
# This script shows processes holding the inotify fd, alone with HOW MANY directories each inotify fd watches(0 will be ignored).
total=0
result="EXE PID FD-INFO INOTIFY-WATCHES\n"
while read pid fd; do \
  exe="$(readlink -f /proc/$pid/exe || echo n/a)"; \
  fdinfo="/proc/$pid/fdinfo/$fd" ; \
  count="$(grep -c inotify "$fdinfo" || true)"; \
  if [ $((count)) != 0 ]; then
    total=$((total+count)); \
    result+="$exe $pid $fdinfo $count\n"; \
  fi
done <<< "$(lsof +c 0 -n -P -u root|awk '/inotify$/ { gsub(/[urw]$/,"",$4); print $2" "$4 }')" && echo "total $total inotify watches" && result="$(echo -e $result|column -t)\n" && echo -e "$result" | head -1 && echo -e "$result" | sed "1d" | sort -k 4rn;
```

示例输出:

```bash
total 7882 inotify watches
EXE                                         PID    FD-INFO                INOTIFY-WATCHES
/usr/local/qcloud/YunJing/YDEyes/YDService  25813  /proc/25813/fdinfo/8   7077
/usr/bin/kubelet                            1173   /proc/1173/fdinfo/22   665
/usr/bin/ruby2.3                            13381  /proc/13381/fdinfo/14  54
/usr/lib/policykit-1/polkitd                1458   /proc/1458/fdinfo/9    14
/lib/systemd/systemd-udevd                  450    /proc/450/fdinfo/9     13
/usr/sbin/nscd                              7935   /proc/7935/fdinfo/3    6
/usr/bin/kubelet                            1173   /proc/1173/fdinfo/28   5
/lib/systemd/systemd                        1      /proc/1/fdinfo/17      4
/lib/systemd/systemd                        1      /proc/1/fdinfo/18      4
/lib/systemd/systemd                        1      /proc/1/fdinfo/26      4
/lib/systemd/systemd                        1      /proc/1/fdinfo/28      4
/usr/lib/policykit-1/polkitd                1458   /proc/1458/fdinfo/8    4
/usr/local/bin/sidecar-injector             4751   /proc/4751/fdinfo/3    3
/usr/lib/accountsservice/accounts-daemon    1178   /proc/1178/fdinfo/7    2
/usr/local/bin/galley                       8228   /proc/8228/fdinfo/10   2
/usr/local/bin/galley                       8228   /proc/8228/fdinfo/9    2
/lib/systemd/systemd                        1      /proc/1/fdinfo/11      1
/sbin/agetty                                1437   /proc/1437/fdinfo/4    1
/sbin/agetty                                1440   /proc/1440/fdinfo/4    1
/usr/bin/kubelet                            1173   /proc/1173/fdinfo/10   1
/usr/local/bin/envoy                        4859   /proc/4859/fdinfo/5    1
/usr/local/bin/envoy                        5427   /proc/5427/fdinfo/5    1
/usr/local/bin/envoy                        6058   /proc/6058/fdinfo/3    1
/usr/local/bin/envoy                        6893   /proc/6893/fdinfo/3    1
/usr/local/bin/envoy                        6950   /proc/6950/fdinfo/3    1
/usr/local/bin/galley                       8228   /proc/8228/fdinfo/3    1
/usr/local/bin/pilot-agent                  3819   /proc/3819/fdinfo/5    1
/usr/local/bin/pilot-agent                  4244   /proc/4244/fdinfo/5    1
/usr/local/bin/pilot-agent                  5901   /proc/5901/fdinfo/3    1
/usr/local/bin/pilot-agent                  6789   /proc/6789/fdinfo/3    1
/usr/local/bin/pilot-agent                  6808   /proc/6808/fdinfo/3    1
/usr/local/bin/pilot-discovery              6231   /proc/6231/fdinfo/3    1
/usr/local/bin/sidecar-injector             4751   /proc/4751/fdinfo/5    1
/usr/sbin/acpid                             1166   /proc/1166/fdinfo/6    1
/usr/sbin/dnsmasq                           7572   /proc/7572/fdinfo/8    1
```

## 调整 inotify watch 限制

如果看到总 watch 数比较大，接近最大限制，可以修改内核参数调高下这个限制。

临时调整:

```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

永久生效:

```bash
echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf && sysctl -p
```

打开 inotify_add_watch 跟踪，进一步 debug inotify watch 耗尽的原因:

```bash
echo 1 >> /sys/kernel/debug/tracing/events/syscalls/sys_exit_inotify_add_watch/enable
```

