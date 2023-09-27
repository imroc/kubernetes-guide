# cgroup 泄露

## 现象

创建 Pod 失败，运行时报错 `no space left on device`:

```txt
Dec 24 11:54:31 VM_16_11_centos dockerd[11419]: time="2018-12-24T11:54:31.195900301+08:00" level=error msg="Handler for POST /v1.31/containers/b98d4aea818bf9d1d1aa84079e1688cd9b4218e008c58a8ef6d6c3c106403e7b/start returned error: OCI runtime create failed: container_linux.go:348: starting container process caused \"process_linux.go:279: applying cgroup configuration for process caused \\\"mkdir /sys/fs/cgroup/memory/kubepods/burstable/pod79fe803c-072f-11e9-90ca-525400090c71/b98d4aea818bf9d1d1aa84079e1688cd9b4218e008c58a8ef6d6c3c106403e7b: no space left on device\\\"\": unknown"
```

## 内核 Bug

`memcg` 是 Linux 内核中用于管理 cgroup 内存的模块，整个生命周期应该是跟随 cgroup 的，但是在低版本内核中\(已知3.10\)，一旦给某个 memory cgroup 开启 kmem accounting 中的 `memory.kmem.limit_in_bytes` 就可能会导致不能彻底删除 memcg 和对应的 cssid，也就是说应用即使已经删除了 cgroup \(`/sys/fs/cgroup/memory` 下对应的 cgroup 目录已经删除\), 但在内核中没有释放 cssid，导致内核认为的 cgroup 的数量实际数量不一致，我们也无法得知内核认为的 cgroup 数量是多少。

关于 cgroup kernel memory，在 [kernel.org](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/memory.html#kernel-memory-extension-config-memcg-kmem) 中有如下描述：

```
2.7 Kernel Memory Extension (CONFIG_MEMCG_KMEM)
-----------------------------------------------

With the Kernel memory extension, the Memory Controller is able to limit
the amount of kernel memory used by the system. Kernel memory is fundamentally
different than user memory, since it can't be swapped out, which makes it
possible to DoS the system by consuming too much of this precious resource.

Kernel memory accounting is enabled for all memory cgroups by default. But
it can be disabled system-wide by passing cgroup.memory=nokmem to the kernel
at boot time. In this case, kernel memory will not be accounted at all.

Kernel memory limits are not imposed for the root cgroup. Usage for the root
cgroup may or may not be accounted. The memory used is accumulated into
memory.kmem.usage_in_bytes, or in a separate counter when it makes sense.
(currently only for tcp).

The main "kmem" counter is fed into the main counter, so kmem charges will
also be visible from the user counter.

Currently no soft limit is implemented for kernel memory. It is future work
to trigger slab reclaim when those limits are reached.
```

这是一个 cgroup memory 的扩展，用于限制对 kernel memory 的使用，但该特性在老于 4.0 版本中是个实验特性，存在泄露问题，在 4.x 较低的版本也还有泄露问题，应该是造成泄露的代码路径没有完全修复，推荐 4.3 以上的内核。

## 造成容器创建失败

这个问题可能会导致创建容器失败，因为创建容器为其需要创建 cgroup 来做隔离，而低版本内核有个限制：允许创建的 cgroup 最大数量写死为 65535 \([点我跳转到 commit](https://github.com/torvalds/linux/commit/38460b48d06440de46b34cb778bd6c4855030754#diff-c04090c51d3c6700c7128e84c58b1291R3384)\)，如果节点上经常创建和销毁大量容器导致创建很多 cgroup，删除容器但没有彻底删除 cgroup 造成泄露\(真实数量我们无法得知\)，到达 65535 后再创建容器就会报创建 cgroup 失败并报错 `no space left on device`，使用 kubernetes 最直观的感受就是 pod 创建之后无法启动成功。

pod 启动失败，报 event 示例:

``` bash
Events:
  Type     Reason                    Age                 From                   Message
  ----     ------                    ----                ----                   -------
  Normal   Scheduled                 15m                 default-scheduler      Successfully assigned jenkins/jenkins-7845b9b665-nrvks to 10.10.252.4
  Warning  FailedCreatePodContainer  25s (x70 over 15m)  kubelet, 10.10.252.4  unable to ensure pod container exists: failed to create container for [kubepods besteffort podc6eeec88-8664-11e9-9524-5254007057ba] : mkdir /sys/fs/cgroup/memory/kubepods/besteffort/podc6eeec88-8664-11e9-9524-5254007057ba: no space left on device
```

dockerd 日志报错示例:

``` bash
Dec 24 11:54:31 VM_16_11_centos dockerd[11419]: time="2018-12-24T11:54:31.195900301+08:00" level=error msg="Handler for POST /v1.31/containers/b98d4aea818bf9d1d1aa84079e1688cd9b4218e008c58a8ef6d6c3c106403e7b/start returned error: OCI runtime create failed: container_linux.go:348: starting container process caused \"process_linux.go:279: applying cgroup configuration for process caused \\\"mkdir /sys/fs/cgroup/memory/kubepods/burstable/pod79fe803c-072f-11e9-90ca-525400090c71/b98d4aea818bf9d1d1aa84079e1688cd9b4218e008c58a8ef6d6c3c106403e7b: no space left on device\\\"\": unknown"
```

kubelet 日志报错示例:

``` bash
Sep 09 18:09:09 VM-0-39-ubuntu kubelet[18902]: I0909 18:09:09.449722   18902 remote_runtime.go:92] RunPodSandbox from runtime service failed: rpc error: code = Unknown desc = failed to start sandbox container for pod "osp-xxx-com-ljqm19-54bf7678b8-bvz9s": Error response from daemon: oci runtime error: container_linux.go:247: starting container process caused "process_linux.go:258: applying cgroup configuration for process caused \"mkdir /sys/fs/cgroup/memory/kubepods/burstable/podf1bd9e87-1ef2-11e8-afd3-fa163ecf2dce/8710c146b3c8b52f5da62e222273703b1e3d54a6a6270a0ea7ce1b194f1b5053: no space left on device\""
```

新版的内核限制为 `2^31` \(可以看成几乎不限制，[点我跳转到代码](https://github.com/torvalds/linux/blob/3120b9a6a3f7487f96af7bd634ec49c87ef712ab/kernel/cgroup/cgroup.c#L5233)\): `cgroup_idr_alloc()` 传入 end 为 0 到 `idr_alloc()`， 再传给 `idr_alloc_u32()`, end 的值最终被三元运算符 `end>0 ? end-1 : INT_MAX` 转成了 `INT_MAX` 常量，即 `2^31`。所以如果新版内核有泄露问题会更难定位，表现形式会是内存消耗严重，幸运的是新版内核已经修复，推荐 4.3 以上。

### 规避方案

如果你用的低版本内核\(比如 CentOS 7 v3.10 的内核\)并且不方便升级内核，可以通过不开启 kmem accounting 来实现规避，但会比较麻烦。

kubelet 和 runc 都会给 memory cgroup 开启 kmem accounting，所以要规避这个问题，就要保证kubelet 和 runc 都别开启 kmem accounting，下面分别进行说明:

#### runc

runc 在合并 [这个PR](https://github.com/opencontainers/runc/pull/1350/files) \(2017-02-27\) 之后创建的容器都默认开启了 kmem accounting，后来社区也注意到这个问题，并做了比较灵活的修复， [PR 1921](https://github.com/opencontainers/runc/pull/1921) 给 runc 增加了 "nokmem" 编译选项，缺省的 release 版本没有使用这个选项， 自己使用 nokmem 选项编译 runc 的方法:

``` bash
cd $GO_PATH/src/github.com/opencontainers/runc/
make BUILDTAGS="seccomp nokmem"
```

docker-ce v18.09.1 之后的 runc 默认关闭了 kmem accounting，所以也可以直接升级 docker 到这个版本之后。

#### kubelet

如果是 1.14 版本及其以上，可以在编译的时候通过 build tag 来关闭 kmem accounting:

``` bash
KUBE_GIT_VERSION=v1.14.1 ./build/run.sh make kubelet GOFLAGS="-tags=nokmem"
```

如果是低版本需要修改代码重新编译。kubelet 在创建 pod 对应的 cgroup 目录时，也会调用 libcontianer 中的代码对 cgroup 做设置，在 `pkg/kubelet/cm/cgroup_manager_linux.go` 的 `Create` 方法中，会调用 `Manager.Apply` 方法，最终调用 `vendor/github.com/opencontainers/runc/libcontainer/cgroups/fs/memory.go` 中的 `MemoryGroup.Apply` 方法，开启 kmem accounting。这里也需要进行处理，可以将这部分代码注释掉然后重新编译 kubelet。

## 参考资料

* 一行 kubernetes 1.9 代码引发的血案（与 CentOS 7.x 内核兼容性问题）: [http://dockone.io/article/4797](http://dockone.io/article/4797)
* Cgroup泄漏--潜藏在你的集群中: [https://tencentcloudcontainerteam.github.io/2018/12/29/cgroup-leaking/](https://tencentcloudcontainerteam.github.io/2018/12/29/cgroup-leaking/)
