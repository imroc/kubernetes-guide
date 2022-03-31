# 排查 Pod CrashLoopBackOff

Pod 如果处于 `CrashLoopBackOff` 状态说明之前是启动了，只是又异常退出了，只要 Pod 的 [restartPolicy](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy) 不是 Never 就可能被重启拉起。

通过 kubectl 可以发现是否有 Pod 发生重启:

```bash
$ kubectl get pod
NAME                      READY   STATUS    RESTARTS   AGE
grafana-c9dd59d46-s9dc6   2/2     Running   2          69d
```

当 `RESTARTS` 大于 0 时，说明 Pod 中有容器重启了。

这时，我们可以先看下容器进程的退出状态码来缩小问题范围。

## 排查容器退出状态码

使用 `kubectl describe pod <pod name>` 查看异常 pod 的状态:

```bash
Containers:
  kubedns:
    Container ID:  docker://5fb8adf9ee62afc6d3f6f3d9590041818750b392dff015d7091eaaf99cf1c945
    Image:         ccr.ccs.tencentyun.com/library/kubedns-amd64:1.14.4
    Image ID:      docker-pullable://ccr.ccs.tencentyun.com/library/kubedns-amd64@sha256:40790881bbe9ef4ae4ff7fe8b892498eecb7fe6dcc22661402f271e03f7de344
    Ports:         10053/UDP, 10053/TCP, 10055/TCP
    Host Ports:    0/UDP, 0/TCP, 0/TCP
    Args:
      --domain=cluster.local.
      --dns-port=10053
      --config-dir=/kube-dns-config
      --v=2
    State:          Running
      Started:      Tue, 27 Aug 2019 10:58:49 +0800
    Last State:     Terminated
      Reason:       Error
      Exit Code:    255
      Started:      Tue, 27 Aug 2019 10:40:42 +0800
      Finished:     Tue, 27 Aug 2019 10:58:27 +0800
    Ready:          True
    Restart Count:  1
```

在容器列表里看 `Last State` 字段，其中 `ExitCode` 即程序上次退出时的状态码，如果不为 0，表示异常退出，我们可以分析下原因。

### 退出状态码的范围

* 必须在 0-255 之间。
* 0 表示正常退出。
* 外界中断将程序退出的时候状态码区间在 129-255，(操作系统给程序发送中断信号，比如 `kill -9` 是 `SIGKILL`，`ctrl+c` 是 `SIGINT`)
* 一般程序自身原因导致的异常退出状态区间在 1-128 (这只是一般约定，程序如果一定要用129-255的状态码也是可以的)，这时可以用 `kubectl logs -p` 查看容器重启前的标准输出。

假如写代码指定的退出状态码时不在 0-255 之间，例如: `exit(-1)`，这时会自动做一个转换，最终呈现的状态码还是会在 0-255 之间。 我们把状态码记为 `code`

* 当指定的退出时状态码为负数，那么转换公式如下:

```text
256 - (|code| % 256)
```

* 当指定的退出时状态码为正数，那么转换公式如下:

```text
code % 256
```

### 常见异常状态码

**0**

此状态码表示正常退出，一般是业务进程主动退出了，可以排查下退出前日志，如果日志有打到标准输出，可以通过 `kubectl logs -p` 查看退出前的容器标准输出。

也可能是存活检查失败被重启，重启时收到 SIGTERM 信号进程正常退出，可以检查事件是否有存活检查失败的日志。

**137**

此状态码说名容器是被 `SIGKILL` 信号强制杀死的。可能原因:
1. 发生 Cgroup OOM。Pod 中容器使用的内存达到了它的资源限制(`resources.limits`)，在 `describe pod` 输出中一般可以看到 Reason 是 `OOMKilled`。
2. 发生系统 OOM，内核会选取一些进程杀掉来释放内存，可能刚好选到某些容器的主进程。
3. `livenessProbe` (存活检查) 失败，kubelet 重启容器时等待超时，最后发 `SIGKILL` 强制重启。
4. 被其它未知进程杀死，比如某些安全组件或恶意木马。

**1 和 255**

这种可能是一般错误，具体错误原因只能看业务日志，因为很多程序员写异常退出时习惯用 `exit(1)` 或 `exit(-1)`，-1 会根据转换规则转成 255。

255 也可能是 Pod 宿主机发生了重启导致的容器重启。

### 状态码参考

这里罗列了一些状态码的含义：[Appendix E. Exit Codes With Special Meanings](https://tldp.org/LDP/abs/html/exitcodes.html)

### Linux 标准中断信号

Linux 程序被外界中断时会发送中断信号，程序退出时的状态码就是中断信号值加上 128 得到的，比如 `SIGKILL` 的中断信号值为 9，那么程序退出状态码就为 9+128=137。以下是标准信号值参考：

```text
Signal     Value     Action   Comment
──────────────────────────────────────────────────────────────────────
SIGHUP        1       Term    Hangup detected on controlling terminal
                                     or death of controlling process
SIGINT        2       Term    Interrupt from keyboard
SIGQUIT       3       Core    Quit from keyboard
SIGILL        4       Core    Illegal Instruction
SIGABRT       6       Core    Abort signal from abort(3)
SIGFPE        8       Core    Floating-point exception
SIGKILL       9       Term    Kill signal
SIGSEGV      11       Core    Invalid memory reference
SIGPIPE      13       Term    Broken pipe: write to pipe with no
                                     readers; see pipe(7)
SIGALRM      14       Term    Timer signal from alarm(2)
SIGTERM      15       Term    Termination signal
SIGUSR1   30,10,16    Term    User-defined signal 1
SIGUSR2   31,12,17    Term    User-defined signal 2
SIGCHLD   20,17,18    Ign     Child stopped or terminated
SIGCONT   19,18,25    Cont    Continue if stopped
SIGSTOP   17,19,23    Stop    Stop process
SIGTSTP   18,20,24    Stop    Stop typed at terminal
SIGTTIN   21,21,26    Stop    Terminal input for background process
SIGTTOU   22,22,27    Stop    Terminal output for background process
```

### C/C++ 退出状态码

`/usr/include/sysexits.h` 试图将退出状态码标准化(仅限 C/C++):

```text
#define EX_OK           0       /* successful termination */

#define EX__BASE        64      /* base value for error messages */

#define EX_USAGE        64      /* command line usage error */
#define EX_DATAERR      65      /* data format error */
#define EX_NOINPUT      66      /* cannot open input */
#define EX_NOUSER       67      /* addressee unknown */
#define EX_NOHOST       68      /* host name unknown */
#define EX_UNAVAILABLE  69      /* service unavailable */
#define EX_SOFTWARE     70      /* internal software error */
#define EX_OSERR        71      /* system error (e.g., can't fork) */
#define EX_OSFILE       72      /* critical OS file missing */
#define EX_CANTCREAT    73      /* can't create (user) output file */
#define EX_IOERR        74      /* input/output error */
#define EX_TEMPFAIL     75      /* temp failure; user is invited to retry */
#define EX_PROTOCOL     76      /* remote error in protocol */
#define EX_NOPERM       77      /* permission denied */
#define EX_CONFIG       78      /* configuration error */

#define EX__MAX 78      /* maximum listed value */
```

## 可能原因

以下是一些可能原因。

### 容器进程主动退出

如果是容器进程主动退出，退出状态码一般在 0-128 之间，除了可能是业务程序 BUG，还有其它许多可能原因。

可以通过 `kubectl logs -p` 查看容器退出前的标准输出，如果有采集业务日志，也可以排查下业务日志。

### 系统 OOM

如果发生系统 OOM，可以看到 Pod 中容器退出状态码是 137，表示被 `SIGKILL` 信号杀死，同时内核会报错: `Out of memory: Kill process ...`。大概率是节点上部署了其它非 K8S 管理的进程消耗了比较多的内存，或者 kubelet 的 `--kube-reserved` 和 `--system-reserved` 配的比较小，没有预留足够的空间给其它非容器进程，节点上所有 Pod 的实际内存占用总量不会超过 `/sys/fs/cgroup/memory/kubepods` 这里 cgroup 的限制，这个限制等于 `capacity - "kube-reserved" - "system-reserved"`，如果预留空间设置合理，节点上其它非容器进程（kubelet, dockerd, kube-proxy, sshd 等) 内存占用没有超过 kubelet 配置的预留空间是不会发生系统 OOM 的，可以根据实际需求做合理的调整。

### cgroup OOM

如果是 cgrou OOM 杀掉的进程，从 Pod 事件的下 `Reason` 可以看到是 `OOMKilled`，说明容器实际占用的内存超过 limit 了，同时内核日志会报: `Memory cgroup out of memory`。 可以根据需求调整下 limit。

### 健康检查失败

参考 [Pod 健康检查失败](../healthcheck-failed.md) 进一步定位。

### 宿主机重启

Pod 所在宿主机重启会导致容器重启，状态码一般为 255。

### 节点内存碎片化

如果节点上内存碎片化严重，缺少大页内存，会导致即使总的剩余内存较多，但还是会申请内存失败，参考 [内存碎片化](../../node/memory-fragmentation.md)。

### 挂载了 configmap subpath

K8S 对 configmap subpath 的支持有个问题，如果容器挂载 configmap 指定了 subpath，且后来修改了 configmap 中的内容，当容器重启时会失败，参考 issue [modified subpath configmap mount fails when container restarts](https://github.com/kubernetes/kubernetes/issues/68211)。

事件日志里可以看出是挂载 subpath 报 `no such file or directory`，describe pod 类似这样:

```txt
    Last State:     Terminated
      Reason:       StartError
      Message:      failed to create containerd task: OCI runtime create failed: container_linux.go:349: starting container process caused "process_linux.go:449: container init caused \"rootfs_linux.go:58: mounting \\\"/data/kubelet/pods/d6f90d2b-a5c4-11ec-8b09-5254009e5e2e/volume-subpaths/conf/demo-container/2\\\" to rootfs \\\"/run/containerd/io.containerd.runtime.v2.task/k8s.io/f28499d3c81b145ef2e88c31adaade0466ef71cee537377a439bad36707a7e3e/rootfs\\\" at \\\"/run/containerd/io.containerd.runtime.v2.task/k8s.io/f28499d3c81b145ef2e88c31adaade0466ef71cee537377a439bad36707a7e3e/rootfs/app/conf/server.yaml\\\" caused \\\"no such file or directory\\\"\"": unknown
      Exit Code:    128
```

> 有些平台实现了原地重启的能力，即更新工作负载不会重建 Pod，只是重启，更容易发生类似的问题。

建议是修改用法，不挂载 subpath。通常使用 subpath 是因为不想覆盖镜像内已有的配置文件，可以将 configmap挂载到其它路径，然后再将镜像内已有的配置文件 include 进来。