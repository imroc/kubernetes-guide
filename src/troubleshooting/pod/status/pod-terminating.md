# 排查 Pod 一直 Terminating

有时候删除 Pod 一直卡在 Terminating 状态，一直删不掉，本文给出排查思路与可能原因。

## 分析思路

Pod 处于 Terminating 状态说明 Pod 是被删除，但一直无法结束。

Pod 被删除主要可能是:
1. 用户主动删除的 Pod。
2. 工作负载在滚动更新，自动删除的 Pod。
3. 触发了节点驱逐，自动清理的 Pod。
4. 节点长时间处于 `NotReady` 状态，Pod 被自动删除以便被重新调度。

Pod 被删除的流程:
1. APIServer 收到删除 Pod 的请求，Pod 被标记删除，处于 `Terminating` 状态。
2. 节点上的 kubelet watch 到了 Pod 被删除，开始销毁 Pod。
3. Kubelet 调用运行时接口，清理相关容器。
4. 所有容器销毁成功，通知 APIServer。
5. APIServer 感知到 Pod 成功销毁，检查 metadata 是否还有 `finalizers`，如果有就等待其它控制器清理完，如果没有就直接从 etcd 中删除 Pod 记录。

可以看出来，删除 Pod 流程涉及到的组件包含: APIServer, etcd, kubelet 与容器运行时 (如 docker、containerd)。

既然都能看到 Pod 卡在 Terminating 状态，说明 APIServer 能正常响应，也能正常从 etcd 中获取数据，一般不会有什么问题，有问题的地方主要就是节点上的操作。

通常可以结合事件与上节点排查来分析。

## 检查 Pod 所在节点是否异常

可以先用 kubectl 初步检查下节点是否异常:

```bash
# 查找 Terminating 的 Pod 及其所在 Node
$ kubectl get pod -o wide | grep Terminating
grafana-5d7ff8cb89-8gdtz                         1/1     Terminating   1          97d    10.10.7.150   172.20.32.15   <none>           <none>

# 检查 Node 是否异常
$ kubectl get node 172.20.32.15
NAME           STATUS      ROLES    AGE    VERSION
172.20.32.15   NotReady    <none>   182d   v1.20.6

# 查看 Node 相关事件
$ kubectl describe node 172.20.32.15
```

如果有监控，查看下节点相关监控指标，没有监控也可以登上节点去排查。

### 节点高负载

如果节点负载过高，分不出足够的 CPU 去销毁 Pod，导致一直无法销毁完成；甚至可能销毁了 Pod，但因负载过高无法与 APIServer 正常通信，一直超时，APIServer 也就无法感知到 Pod 被销毁，导致 Pod 一直无法被彻底删除。

### 节点被关机

如果节点关机了，自然无法进行销毁 Pod 的操作。

### 节点网络异常

如果节点因网络异常无法与 APIServer 通信，APIServer 也就无法感知到 Pod 被销毁，导致 Pod 一直不会被彻底删除。

网络异常的原因可能很多，比如:
1. iptables 规则有问题。
2. 路由配置有问题。
3. 网卡被 down。
4. BPF 程序问题。

### 内核异常

有时候可能触发内核 BUG 导致节点异常，检查下内核日志:

```bash
dmesg
# journalctl -k
```

## 分析 kubelet 与容器运行时

先检查下 kubelet 与容器运行时是否在运行:

```bash
ps -ef | grep kubelet
ps -ef | grep containerd
# ps -ef | grep dockerd
```

分析 kubelet 日志:

```bash
journalctl -u kubelet --since "3 hours ago" | grep $POD_NAME
```

分析运行时日志:

```bash
journalctl -u containerd
# journalctl -u dockerd
```

### 磁盘爆满

如果容器运行时 (docker 或 containerd 等) 的数据目录所在磁盘被写满，运行时就无法正常无法创建和销毁容器，kubelet 调用运行时去删除容器时就没有反应，看 event 类似这样：

```bash
Normal  Killing  39s (x735 over 15h)  kubelet, 10.179.80.31  Killing container with id docker://apigateway:Need to kill Pod
```

解决方案：清理磁盘空间

### 存在 "i" 文件属性

如果容器的镜像本身或者容器启动后写入的文件存在 "i" 文件属性，此文件就无法被修改删除，而删除 Pod 时会清理容器目录，但里面包含有不可删除的文件，就一直删不了，Pod 状态也将一直保持 Terminating，kubelet 报错:

``` log
Sep 27 14:37:21 VM_0_7_centos kubelet[14109]: E0927 14:37:21.922965   14109 remote_runtime.go:250] RemoveContainer "19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257" from runtime service failed: rpc error: code = Unknown desc = failed to remove container "19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257": Error response from daemon: container 19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257: driver "overlay2" failed to remove root filesystem: remove /data/docker/overlay2/b1aea29c590aa9abda79f7cf3976422073fb3652757f0391db88534027546868/diff/usr/bin/bash: operation not permitted
Sep 27 14:37:21 VM_0_7_centos kubelet[14109]: E0927 14:37:21.923027   14109 kuberuntime_gc.go:126] Failed to remove container "19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257": rpc error: code = Unknown desc = failed to remove container "19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257": Error response from daemon: container 19d837c77a3c294052a99ff9347c520bc8acb7b8b9a9dc9fab281fc09df38257: driver "overlay2" failed to remove root filesystem: remove /data/docker/overlay2/b1aea29c590aa9abda79f7cf3976422073fb3652757f0391db88534027546868/diff/usr/bin/bash: operation not permitted
```

通过 `man chattr` 查看 "i" 文件属性描述:

``` txt
       A file with the 'i' attribute cannot be modified: it cannot be deleted or renamed, no
link can be created to this file and no data can be written to the file.  Only the superuser
or a process possessing the CAP_LINUX_IMMUTABLE capability can set or clear this attribute.
```

彻底解决当然是不要在容器镜像中或启动后的容器设置 "i" 文件属性，临时恢复方法： 复制 kubelet 日志报错提示的文件路径，然后执行 `chattr -i <file>`:

``` bash
chattr -i /data/docker/overlay2/b1aea29c590aa9abda79f7cf3976422073fb3652757f0391db88534027546868/diff/usr/bin/bash
```

执行完后等待 kubelet 自动重试，Pod 就可以被自动删除了。

### docker 17 的 bug

docker hang 住，没有任何响应，看 event:

```bash
Warning FailedSync 3m (x408 over 1h) kubelet, 10.179.80.31 error determining status: rpc error: code = DeadlineExceeded desc = context deadline exceeded
```

怀疑是17版本dockerd的BUG。可通过 `kubectl -n cn-staging delete pod apigateway-6dc48bf8b6-clcwk --force --grace-period=0` 强制删除pod，但 `docker ps` 仍看得到这个容器

处置建议：

* 升级到docker 18. 该版本使用了新的 containerd，针对很多bug进行了修复。
* 如果出现terminating状态的话，可以提供让容器专家进行排查，不建议直接强行删除，会可能导致一些业务上问题。

### 低版本 kubelet list-watch 的 bug

之前遇到过使用 v1.8.13 版本的 k8s，kubelet 有时 list-watch 出问题，删除 pod 后 kubelet 没收到事件，导致 kubelet 一直没做删除操作，所以 pod 状态一直是 Terminating

### dockerd 与 containerd 的状态不同步

判断 dockerd 与 containerd 某个容器的状态不同步的方法：

* describe pod 拿到容器 id
* docker ps 查看的容器状态是 dockerd 中保存的状态
* 通过 docker-container-ctr 查看容器在 containerd 中的状态，比如:
  ``` bash
  $ docker-container-ctr --namespace moby --address /var/run/docker/containerd/docker-containerd.sock task ls |grep a9a1785b81343c3ad2093ad973f4f8e52dbf54823b8bb089886c8356d4036fe0
  a9a1785b81343c3ad2093ad973f4f8e52dbf54823b8bb089886c8356d4036fe0    30639    STOPPED
  ```

containerd 看容器状态是 stopped 或者已经没有记录，而 docker 看容器状态却是 runing，说明 dockerd 与 containerd 之间容器状态同步有问题，目前发现了 docker 在 aufs 存储驱动下如果磁盘爆满可能发生内核 panic :

``` txt
aufs au_opts_verify:1597:dockerd[5347]: dirperm1 breaks the protection by the permission bits on the lower branch
```

如果磁盘爆满过，dockerd 一般会有下面类似的日志:

``` log
Sep 18 10:19:49 VM-1-33-ubuntu dockerd[4822]: time="2019-09-18T10:19:49.903943652+08:00" level=error msg="Failed to log msg \"\" for logger json-file: write /opt/docker/containers/54922ec8b1863bcc504f6dac41e40139047f7a84ff09175d2800100aaccbad1f/54922ec8b1863bcc504f6dac41e40139047f7a84ff09175d2800100aaccbad1f-json.log: no space left on device"
```

随后可能发生状态不同步，已提issue:  https://github.com/docker/for-linux/issues/779

* 临时恢复: 执行 `docker container prune` 或重启 dockerd
* 长期方案: 运行时推荐直接使用 containerd，绕过 dockerd 避免 docker 本身的各种 BUG

### Daemonset Controller 的 BUG

有个 k8s 的 bug 会导致 daemonset pod 无限 terminating，1.10 和 1.11 版本受影响，原因是 daemonset controller 复用 scheduler 的 predicates 逻辑，里面将 nodeAffinity 的 nodeSelector 数组做了排序（传的指针），spec 就会跟 apiserver 中的不一致，daemonset controller 又会为 rollingUpdate类型计算 hash (会用到spec)，用于版本控制，造成不一致从而无限启动和停止的循环。

* issue: https://github.com/kubernetes/kubernetes/issues/66298
* 修复的PR: https://github.com/kubernetes/kubernetes/pull/66480

升级集群版本可以彻底解决，临时规避可以给 rollingUpdate 类型 daemonset 不使用 nodeAffinity，改用 nodeSelector。

### mount 的目录被其它进程占用

dockerd 报错 `device or resource busy`:

``` bash
May 09 09:55:12 VM_0_21_centos dockerd[6540]: time="2020-05-09T09:55:12.774467604+08:00" level=error msg="Handler for DELETE /v1.38/containers/b62c3796ea2ed5a0bd0eeed0e8f041d12e430a99469dd2ced6f94df911e35905 returned error: container b62c3796ea2ed5a0bd0eeed0e8f041d12e430a99469dd2ced6f94df911e35905: driver \"overlay2\" failed to remove root filesystem: remove /data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/merged: device or resource busy"
```

查找还有谁在"霸占"此目录:

``` bash
$ grep 8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59 /proc/*/mountinfo
/proc/27187/mountinfo:4500 4415 0:898 / /var/lib/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/merged rw,relatime - overlay overlay rw,lowerdir=/data/docker/overlay2/l/DNQH6VPJHFFANI36UDKS262BZK:/data/docker/overlay2/l/OAYZKUKWNH7GPT4K5MFI6B7OE5:/data/docker/overlay2/l/ANQD5O27DRMTZJG7CBHWUA65YT:/data/docker/overlay2/l/G4HYAKVIRVUXB6YOXRTBYUDVB3:/data/docker/overlay2/l/IRGHNAKBHJUOKGLQBFBQTYFCFU:/data/docker/overlay2/l/6QG67JLGKMFXGVB5VCBG2VYWPI:/data/docker/overlay2/l/O3X5VFRX2AO4USEP2ZOVNLL4ZK:/data/docker/overlay2/l/H5Q5QE6DMWWI75ALCIHARBA5CD:/data/docker/overlay2/l/LFISJNWBKSRTYBVBPU6PH3YAAZ:/data/docker/overlay2/l/JSF6H5MHJEC4VVAYOF5PYIMIBQ:/data/docker/overlay2/l/7D2F45I5MF2EHDOARROYPXCWHZ:/data/docker/overlay2/l/OUJDAGNIZXVBKBWNYCAUI5YSGG:/data/docker/overlay2/l/KZLUO6P3DBNHNUH2SNKPTFZOL7:/data/docker/overlay2/l/O2BPSFNCVXTE4ZIWGYSRPKAGU4,upperdir=/data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/diff,workdir=/data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/work
/proc/27187/mountinfo:4688 4562 0:898 / /var/lib/docker/overlay2/81c322896bb06149c16786dc33c83108c871bb368691f741a1e3a9bfc0a56ab2/merged/data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/merged rw,relatime - overlay overlay rw,lowerdir=/data/docker/overlay2/l/DNQH6VPJHFFANI36UDKS262BZK:/data/docker/overlay2/l/OAYZKUKWNH7GPT4K5MFI6B7OE5:/data/docker/overlay2/l/ANQD5O27DRMTZJG7CBHWUA65YT:/data/docker/overlay2/l/G4HYAKVIRVUXB6YOXRTBYUDVB3:/data/docker/overlay2/l/IRGHNAKBHJUOKGLQBFBQTYFCFU:/data/docker/overlay2/l/6QG67JLGKMFXGVB5VCBG2VYWPI:/data/docker/overlay2/l/O3X5VFRX2AO4USEP2ZOVNLL4ZK:/data/docker/overlay2/l/H5Q5QE6DMWWI75ALCIHARBA5CD:/data/docker/overlay2/l/LFISJNWBKSRTYBVBPU6PH3YAAZ:/data/docker/overlay2/l/JSF6H5MHJEC4VVAYOF5PYIMIBQ:/data/docker/overlay2/l/7D2F45I5MF2EHDOARROYPXCWHZ:/data/docker/overlay2/l/OUJDAGNIZXVBKBWNYCAUI5YSGG:/data/docker/overlay2/l/KZLUO6P3DBNHNUH2SNKPTFZOL7:/data/docker/overlay2/l/O2BPSFNCVXTE4ZIWGYSRPKAGU4,upperdir=/data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/diff,workdir=/data/docker/overlay2/8bde3ec18c5a6915f40dd8adc3b2f296c1e40cc1b2885db4aee0a627ff89ef59/work
```

> 自行替换容器 id

找到进程号后查看此进程更多详细信息:

``` bash
ps -f 27187
```

> 更多请参考 [排查 device or resource busy](device-or-resource-busy.md)。

## 检查 Finalizers

k8s 资源的 metadata 里如果存在 `finalizers`，那么该资源一般是由某程序创建的，并且在其创建的资源的 metadata 里的 `finalizers` 加了一个它的标识，这意味着这个资源被删除时需要由创建资源的程序来做删除前的清理，清理完了它需要将标识从该资源的 `finalizers` 中移除，然后才会最终彻底删除资源。比如 Rancher 创建的一些资源就会写入 `finalizers` 标识。

处理建议：`kubectl edit` 手动编辑资源定义，删掉 `finalizers`，这时再看下资源，就会发现已经删掉了。

## 检查 terminationGracePeriodSeconds 是否过大

如果满足以下条件:
1. Pod 配置了 `terminationGracePeriodSeconds` 且值非常大（比如 86400)。
2. 主进程没有处理 SIGTERM 信号(比如主进程是 shell 或 systemd)。

就会导致删除 Pod 不能立即退出，需要等到超时阈值(`terminationGracePeriodSeconds`)后强杀进程，而超时时间非常长，看起来就像一直卡在 Terminating 中。

解决方案:
1. 等待超时时间自动删除。
2. 使用 kubectl 强删:
    ```bash
    kubectl delete pod --force --grace-period=0 POD_NAME
    ```
## propagation type 问题

Pod 事件报错:

```txt
unlinkat /var/run/netns/cni-49ddd103-d374-1f86-7324-13abaeb9c910: device or resource busy
```

原因与解决方案参考: [挂载根目录导致 device or resource busy](../../cases/runtime/mount-root-causing-device-or-resource-busy.md)。