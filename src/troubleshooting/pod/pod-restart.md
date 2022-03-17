# 分析 Pod 重启原因

通过 kubectl 可以发现是否有 Pod 发生重启:

```bash
$ kubectl get pod
NAME                      READY   STATUS    RESTARTS   AGE
grafana-c9dd59d46-s9dc6   2/2     Running   2          69d
```

当 `RESTARTS` 大于 0 时，说明 Pod 中有容器重启了。

## 检查容器退出状态码

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

## 退出状态码的范围

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

## 常见异常状态码

### 0

此状态码表示正常退出，一般是业务进程主动退出了，可以排查下退出前日志，如果日志有打到标准输出，可以通过 `kubectl logs -p` 查看退出前的容器标准输出。

也可能是存活检查失败被重启，重启时收到 SIGTERM 信号进程正常退出，可以检查事件是否有存活检查失败的日志。

### 137

此状态码说名容器是被 `SIGKILL` 信号强制杀死的。可能原因:
1. 发生 Cgroup OOM。Pod 中容器使用的内存达到了它的资源限制(`resources.limits`)，在 `describe pod` 输出中一般可以看到 Reason 是 `OOMKilled`。
2. 发生系统 OOM，内核会选取一些进程杀掉来释放内存，可能刚好选到某些容器的主进程。
3. `livenessProbe` (存活检查) 失败，kubelet 重启容器时等待超时，最后发 `SIGKILL` 强制重启。
4. 被其它未知进程杀死，比如某些安全组件或恶意木马。

### 1 和 255
    
这种可能是一般错误，具体错误原因只能看业务日志，因为很多程序员写异常退出时习惯用 `exit(1)` 或 `exit(-1)`，-1 会根据转换规则转成 255。

## 状态码参考

这里罗列了一些状态码的含义：[Appendix E. Exit Codes With Special Meanings](https://tldp.org/LDP/abs/html/exitcodes.html)

## Linux 标准中断信号

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

## C/C++ 退出状态码

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

