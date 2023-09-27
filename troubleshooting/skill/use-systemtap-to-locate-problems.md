# 使用 Systemtap 定位疑难杂症

## 安装

### Ubuntu

安装 systemtap:

```bash
apt install -y systemtap
```

运行 `stap-prep` 检查还有什么需要安装:

```bash
$ stap-prep
Please install linux-headers-4.4.0-104-generic
You need package linux-image-4.4.0-104-generic-dbgsym but it does not seem to be available
 Ubuntu -dbgsym packages are typically in a separate repository
 Follow https://wiki.ubuntu.com/DebuggingProgramCrash to add this repository

apt install -y linux-headers-4.4.0-104-generic
```

提示需要 dbgsym 包但当前已有软件源中并不包含，需要使用第三方软件源安装，下面是 dbgsym 安装方法\(参考官方wiki: [https://wiki.ubuntu.com/Kernel/Systemtap](https://wiki.ubuntu.com/Kernel/Systemtap)\):

```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C8CAB6595FDFF622

codename=$(lsb_release -c | awk  '{print $2}')
sudo tee /etc/apt/sources.list.d/ddebs.list << EOF
deb http://ddebs.ubuntu.com/ ${codename}      main restricted universe multiverse
deb http://ddebs.ubuntu.com/ ${codename}-security main restricted universe multiverse
deb http://ddebs.ubuntu.com/ ${codename}-updates  main restricted universe multiverse
deb http://ddebs.ubuntu.com/ ${codename}-proposed main restricted universe multiverse
EOF

sudo apt-get update
```

配置好源后再运行下 `stap-prep`:

```bash
$ stap-prep
Please install linux-headers-4.4.0-104-generic
Please install linux-image-4.4.0-104-generic-dbgsym
```

提示需要装这两个包，我们安装一下:

```bash
apt install -y linux-image-4.4.0-104-generic-dbgsym
apt install -y linux-headers-4.4.0-104-generic
```

### CentOS

安装 systemtap:

```bash
yum install -y systemtap
```

默认没装 `debuginfo`，我们需要装一下，添加软件源 `/etc/yum.repos.d/CentOS-Debug.repo`:

```bash
[debuginfo]
name=CentOS-$releasever - DebugInfo
baseurl=http://debuginfo.centos.org/$releasever/$basearch/
gpgcheck=0
enabled=1
protect=1
priority=1
```

执行 `stap-prep` \(会安装 `kernel-debuginfo`\)

最后检查确保 `kernel-debuginfo` 和 `kernel-devel` 均已安装并且版本跟当前内核版本相同，如果有多个版本，就删除跟当前内核版本不同的包\(通过`uname -r`查看当前内核版本\)。

重点检查是否有多个版本的 `kernel-devel`:

```bash
$ rpm -qa | grep kernel-devel
kernel-devel-3.10.0-327.el7.x86_64
kernel-devel-3.10.0-514.26.2.el7.x86_64
kernel-devel-3.10.0-862.9.1.el7.x86_64
```

如果存在多个，保证只留跟当前内核版本相同的那个，假设当前内核版本是 `3.10.0-862.9.1.el7.x86_64`，那么使用 rpm 删除多余的版本:

```bash
rpm -e kernel-devel-3.10.0-327.el7.x86_64 kernel-devel-3.10.0-514.26.2.el7.x86_64
```

## 使用 systemtap 揪出杀死容器的真凶

Pod 莫名其妙被杀死? 可以使用 systemtap 来监视进程的信号发送，原理是 systemtap 将脚本翻译成 C 代码然后调用 gcc 编译成 linux 内核模块，再通过 `modprobe` 加载到内核，根据脚本内容在内核做各种 hook，在这里我们就 hook 一下信号的发送，找出是谁 kill 掉了容器进程。

首先，找到被杀死的 pod 又自动重启的容器的当前 pid，describe 一下 pod:

```bash
    ......
    Container ID:  docker://5fb8adf9ee62afc6d3f6f3d9590041818750b392dff015d7091eaaf99cf1c945
    ......
    Last State:     Terminated
      Reason:       Error
      Exit Code:    137
      Started:      Thu, 05 Sep 2019 19:22:30 +0800
      Finished:     Thu, 05 Sep 2019 19:33:44 +0800
```

拿到容器 id 反查容器的主进程 pid:

```bash
$ docker inspect -f "{{.State.Pid}}" 5fb8adf9ee62afc6d3f6f3d9590041818750b392dff015d7091eaaf99cf1c945
7942
```

通过 `Exit Code` 可以看出容器上次退出的状态码，如果进程是被外界中断信号杀死的，退出状态码将在 129-255 之间，137 表示进程是被 SIGKILL 信号杀死的，但我们从这里并不能看出是被谁杀死的。

如果问题可以复现，我们可以使用下面的 systemtap 脚本来监视容器是被谁杀死的\(保存为`sg.stp`\):

```bash
global target_pid = 7942
probe signal.send{
  if (sig_pid == target_pid) {
    printf("%s(%d) send %s to %s(%d)\n", execname(), pid(), sig_name, pid_name, sig_pid);
    printf("parent of sender: %s(%d)\n", pexecname(), ppid())
    printf("task_ancestry:%s\n", task_ancestry(pid2task(pid()), 1));
  }
}
```

* 变量 `pid` 的值替换为查到的容器主进程 pid

运行脚本:

```bash
stap sg.stp
```

当容器进程被杀死时，脚本捕捉到事件，执行输出:

```text
pkill(23549) send SIGKILL to server(7942)
parent of sender: bash(23495)
task_ancestry:swapper/0(0m0.000000000s)=>systemd(0m0.080000000s)=>vGhyM0(19491m2.579563677s)=>sh(33473m38.074571885s)=>bash(33473m38.077072025s)=>bash(33473m38.081028267s)=>bash(33475m4.817798337s)=>pkill(33475m5.202486630s)
```

通过观察 `task_ancestry` 可以看到杀死进程的所有父进程，在这里可以看到有个叫 `vGhyM0` 的奇怪进程名，通常是中了木马，需要安全专家介入继续排查。

