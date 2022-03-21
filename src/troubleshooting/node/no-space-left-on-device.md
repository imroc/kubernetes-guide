# no space left on device

- 有时候节点 NotReady， kubelet 日志报 `no space left on device`。
- 有时候创建 Pod 失败，`describe pod` 看 event 报 `no space left on device`。

出现这种错误有很多中可能原因，下面我们来根据现象找对应原因。

## inotify watch 耗尽

节点 NotReady，kubelet 启动失败，看 kubelet 日志:

``` bash
Jul 18 15:20:58 VM_16_16_centos kubelet[11519]: E0718 15:20:58.280275   11519 raw.go:140] Failed to watch directory "/sys/fs/cgroup/memory/kubepods": inotify_add_watch /sys/fs/cgroup/memory/kubepods/burstable/pod926b7ff4-7bff-11e8-945b-52540048533c/6e85761a30707b43ed874e0140f58839618285fc90717153b3cbe7f91629ef5a: no space left on device
```

系统调用 `inotify_add_watch` 失败，提示 `no space left on device`， 这是因为系统上进程 watch 文件目录的总数超出了最大限制，可以修改内核参数调高限制，详细请参考本书 [处理实践: inotify watch 耗尽](../../../handle/runnig-out-of-inotify-watches/)

## cgroup 泄露

查看当前 cgroup 数量:

``` bash
$ cat /proc/cgroups | column -t
#subsys_name  hierarchy  num_cgroups  enabled
cpuset        5          29           1
cpu           7          126          1
cpuacct       7          126          1
memory        9          127          1
devices       4          126          1
freezer       2          29           1
net_cls       6          29           1
blkio         10         126          1
perf_event    3          29           1
hugetlb       11         29           1
pids          8          126          1
net_prio      6          29           1
```

cgroup 子系统目录下面所有每个目录及其子目录都认为是一个独立的 cgroup，所以也可以在文件系统中统计目录数来获取实际 cgroup 数量，通常跟 `/proc/cgroups` 里面看到的应该一致:

``` bash
$ find -L /sys/fs/cgroup/memory -type d | wc -l
127
```

当 cgroup 泄露发生时，这里的数量就不是真实的了，低版本内核限制最大 65535 个 cgroup，并且开启 kmem 删除 cgroup 时会泄露，大量创建删除容器后泄露了许多 cgroup，最终总数达到 65535，新建容器创建 cgroup 将会失败，报 `no space left on device`

详细请参考本书 [排障案例: cgroup 泄露](../cases/node/cgroup-leaking.md)

## 磁盘被写满

Pod 启动失败，状态 `CreateContainerError`:

``` bash
csi-cephfsplugin-27znb                        0/2     CreateContainerError   167        17h
```

Pod 事件报错:

``` bash
  Warning  Failed   5m1s (x3397 over 17h)  kubelet, ip-10-0-151-35.us-west-2.compute.internal  (combined from similar events): Error: container create failed: container_linux.go:336: starting container process caused "process_linux.go:399: container init caused \"rootfs_linux.go:58: mounting \\\"/sys\\\" to rootfs \\\"/var/lib/containers/storage/overlay/051e985771cc69f3f699895a1dada9ef6483e912b46a99e004af7bb4852183eb/merged\\\" at \\\"/var/lib/containers/storage/overlay/051e985771cc69f3f699895a1dada9ef6483e912b46a99e004af7bb4852183eb/merged/sys\\\" caused \\\"no space left on device\\\"\""
```
