# 内存碎片化

## 判断是否内存碎片化严重

内存页分配失败，内核日志报类似下面的错：

```bash
mysqld: page allocation failure. order:4, mode:0x10c0d0
```

* `mysqld` 是被分配的内存的程序
* `order` 表示需要分配连续页的数量\(2^order\)，这里 4 表示 2^4=16 个连续的页
* `mode` 是内存分配模式的标识，定义在内核源码文件 `include/linux/gfp.h` 中，通常是多个标识相与运算的结果，不同版本内核可能不一样，比如在新版内核中 `GFP_KERNEL` 是 `__GFP_RECLAIM | __GFP_IO | __GFP_FS` 的运算结果，而 `__GFP_RECLAIM` 又是 `___GFP_DIRECT_RECLAIM|___GFP_KSWAPD_RECLAIM` 的运算结果

当 order 为 0 时，说明系统以及完全没有可用内存了，order 值比较大时，才说明内存碎片化了，无法分配连续的大页内存。

## 内存碎片化造成的问题

### 容器启动失败

K8S 会为每个 pod 创建 netns 来隔离 network namespace，内核初始化 netns 时会为其创建 nf\_conntrack 表的 cache，需要申请大页内存，如果此时系统内存已经碎片化，无法分配到足够的大页内存内核就会报错\(`v2.6.33 - v4.6`\):

```bash
runc:[1:CHILD]: page allocation failure: order:6, mode:0x10c0d0
```

Pod 状态将会一直在 ContainerCreating，dockerd 启动容器失败，日志报错:

```text
Jan 23 14:15:31 dc05 dockerd: time="2019-01-23T14:15:31.288446233+08:00" level=error msg="containerd: start container" error="oci runtime error: container_linux.go:247: starting container process caused \"process_linux.go:245: running exec setns process for init caused \\\"exit status 6\\\"\"\n" id=5b9be8c5bb121264899fac8d9d36b02150269d41ce96ba6ad36d70b8640cb01c
Jan 23 14:15:31 dc05 dockerd: time="2019-01-23T14:15:31.317965799+08:00" level=error msg="Create container failed with error: invalid header field value \"oci runtime error: container_linux.go:247: starting container process caused \\\"process_linux.go:245: running exec setns process for init caused \\\\\\\"exit status 6\\\\\\\"\\\"\\n\""
```

kubelet 日志报错:

```text
Jan 23 14:15:31 dc05 kubelet: E0123 14:15:31.352386   26037 remote_runtime.go:91] RunPodSandbox from runtime service failed: rpc error: code = 2 desc = failed to start sandbox container for pod "matchdataserver-1255064836-t4b2w": Error response from daemon: {"message":"invalid header field value \"oci runtime error: container_linux.go:247: starting container process caused \\\"process_linux.go:245: running exec setns process for init caused \\\\\\\"exit status 6\\\\\\\"\\\"\\n\""}
Jan 23 14:15:31 dc05 kubelet: E0123 14:15:31.352496   26037 kuberuntime_sandbox.go:54] CreatePodSandbox for pod "matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)" failed: rpc error: code = 2 desc = failed to start sandbox container for pod "matchdataserver-1255064836-t4b2w": Error response from daemon: {"message":"invalid header field value \"oci runtime error: container_linux.go:247: starting container process caused \\\"process_linux.go:245: running exec setns process for init caused \\\\\\\"exit status 6\\\\\\\"\\\"\\n\""}
Jan 23 14:15:31 dc05 kubelet: E0123 14:15:31.352518   26037 kuberuntime_manager.go:618] createPodSandbox for pod "matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)" failed: rpc error: code = 2 desc = failed to start sandbox container for pod "matchdataserver-1255064836-t4b2w": Error response from daemon: {"message":"invalid header field value \"oci runtime error: container_linux.go:247: starting container process caused \\\"process_linux.go:245: running exec setns process for init caused \\\\\\\"exit status 6\\\\\\\"\\\"\\n\""}
Jan 23 14:15:31 dc05 kubelet: E0123 14:15:31.352580   26037 pod_workers.go:182] Error syncing pod 485fd485-1ed6-11e9-8661-0a587f8021ea ("matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)"), skipping: failed to "CreatePodSandbox" for "matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)" with CreatePodSandboxError: "CreatePodSandbox for pod \"matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)\" failed: rpc error: code = 2 desc = failed to start sandbox container for pod \"matchdataserver-1255064836-t4b2w\": Error response from daemon: {\"message\":\"invalid header field value \\\"oci runtime error: container_linux.go:247: starting container process caused \\\\\\\"process_linux.go:245: running exec setns process for init caused \\\\\\\\\\\\\\\"exit status 6\\\\\\\\\\\\\\\"\\\\\\\"\\\\n\\\"\"}"
Jan 23 14:15:31 dc05 kubelet: I0123 14:15:31.372181   26037 kubelet.go:1916] SyncLoop (PLEG): "matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)", event: &pleg.PodLifecycleEvent{ID:"485fd485-1ed6-11e9-8661-0a587f8021ea", Type:"ContainerDied", Data:"5b9be8c5bb121264899fac8d9d36b02150269d41ce96ba6ad36d70b8640cb01c"}
Jan 23 14:15:31 dc05 kubelet: W0123 14:15:31.372225   26037 pod_container_deletor.go:77] Container "5b9be8c5bb121264899fac8d9d36b02150269d41ce96ba6ad36d70b8640cb01c" not found in pod's containers
Jan 23 14:15:31 dc05 kubelet: I0123 14:15:31.678211   26037 kuberuntime_manager.go:383] No ready sandbox for pod "matchdataserver-1255064836-t4b2w_basic(485fd485-1ed6-11e9-8661-0a587f8021ea)" can be found. Need to start a new one
```

查看slab \(后面的0多表示伙伴系统没有大块内存了\)：

```bash
$ cat /proc/buddyinfo
Node 0, zone      DMA      1      0      1      0      2      1      1      0      1      1      3
Node 0, zone    DMA32   2725    624    489    178      0      0      0      0      0      0      0
Node 0, zone   Normal   1163   1101    932    222      0      0      0      0      0      0      0
```

### 系统 OOM

内存碎片化会导致即使当前系统总内存比较多，但由于无法分配足够的大页内存导致给进程分配内存失败，就认为系统内存不够用，需要杀掉一些进程来释放内存，从而导致系统 OOM

## 解决方法

* 周期性地或者在发现大块内存不足时，先进行drop\_cache操作:

```bash
echo 3 > /proc/sys/vm/drop_caches
```

* 必要时候进行内存整理，开销会比较大，会造成业务卡住一段时间\(慎用\):

```bash
echo 1 > /proc/sys/vm/compact_memory
```

## 如何防止内存碎片化

TODO

## 附录

相关链接：

* [https://huataihuang.gitbooks.io/cloud-atlas/content/os/linux/kernel/memory/drop\_caches\_and\_compact\_memory.html](https://huataihuang.gitbooks.io/cloud-atlas/content/os/linux/kernel/memory/drop_caches_and_compact_memory.html)

