# Pod 一直 ContainerCreating 或 Waiting

## Pod 配置错误

* 检查是否打包了正确的镜像
* 检查配置了正确的容器参数

## 挂载 Volume 失败

Volume 挂载失败也分许多种情况，先列下我这里目前已知的。

### Pod 漂移没有正常解挂之前的磁盘

在云尝试托管的 K8S 服务环境下，默认挂载的 Volume 一般是块存储类型的云硬盘，如果某个节点挂了，kubelet 无法正常运行或与 apiserver 通信，到达时间阀值后会触发驱逐，自动在其它节点上启动相同的副本 (Pod 漂移)，但是由于被驱逐的 Node 无法正常运行并不知道自己被驱逐了，也就没有正常执行解挂，cloud-controller-manager 也在等解挂成功后再调用云厂商的接口将磁盘真正从节点上解挂，通常会等到一个时间阀值后 cloud-controller-manager 会强制解挂云盘，然后再将其挂载到 Pod 最新所在节点上，这种情况下 ContainerCreating 的时间相对长一点，但一般最终是可以启动成功的，除非云厂商的 cloud-controller-manager 逻辑有 bug。

### 命中 K8S 挂载 configmap/secret 的 subpath 的 bug

最近发现如果 Pod 挂载了 configmap 或 secret， 如果后面修改了 configmap 或 secret 的内容，Pod 里的容器又原地重启了(比如存活检查失败被 kill 然后重启拉起)，就会触发 K8S 的这个 bug，团队的小伙伴已提 PR: https://github.com/kubernetes/kubernetes/pull/82784

如果是这种情况，容器会一直启动不成功，可以看到类似以下的报错:

``` bash
$ kubectl -n prod get pod -o yaml manage-5bd487cf9d-bqmvm
...
lastState: terminated
containerID: containerd://e6746201faa1dfe7f3251b8c30d59ebf613d99715f3b800740e587e681d2a903
exitCode: 128
finishedAt: 2019-09-15T00:47:22Z
message: 'failed to create containerd task: OCI runtime create failed: container_linux.go:345:
starting container process caused "process_linux.go:424: container init
caused \"rootfs_linux.go:58: mounting \\\"/var/lib/kubelet/pods/211d53f4-d08c-11e9-b0a7-b6655eaf02a6/volume-subpaths/manage-config-volume/manage/0\\\"
to rootfs \\\"/run/containerd/io.containerd.runtime.v1.linux/k8s.io/e6746201faa1dfe7f3251b8c30d59ebf613d99715f3b800740e587e681d2a903/rootfs\\\"
at \\\"/run/containerd/io.containerd.runtime.v1.linux/k8s.io/e6746201faa1dfe7f3251b8c30d59ebf613d99715f3b800740e587e681d2a903/rootfs/app/resources/application.properties\\\"
caused \\\"no such file or directory\\\"\"": unknown'
```

## 磁盘爆满

启动 Pod 会调 CRI 接口创建容器，容器运行时创建容器时通常会在数据目录下为新建的容器创建一些目录和文件，如果数据目录所在的磁盘空间满了就会创建失败并报错:

```bash
Events:
  Type     Reason                  Age                  From                   Message
  ----     ------                  ----                 ----                   -------
  Warning  FailedCreatePodSandBox  2m (x4307 over 16h)  kubelet, 10.179.80.31  (combined from similar events): Failed create pod sandbox: rpc error: code = Unknown desc = failed to create a sandbox for pod "apigateway-6dc48bf8b6-l8xrw": Error response from daemon: mkdir /var/lib/docker/aufs/mnt/1f09d6c1c9f24e8daaea5bf33a4230de7dbc758e3b22785e8ee21e3e3d921214-init: no space left on device
```

解决方法参考本书 [节点排障：磁盘爆满](../node/disk-full.md)

## 节点内存碎片化

如果节点上内存碎片化严重，缺少大页内存，会导致即使总的剩余内存较多，但还是会申请内存失败，参考 [节点排障: 内存碎片化](../node/memory-fragmentation.md)

## limit 设置太小或者单位不对

如果 limit 设置过小以至于不足以成功运行 Sandbox 也会造成这种状态，常见的是因为 memory limit 单位设置不对造成的 limit 过小，比如误将 memory 的 limit 单位像 request 一样设置为小 `m`，这个单位在 memory 不适用，会被 k8s 识别成 byte，  应该用 `Mi` 或 `M`。，

举个例子: 如果 memory limit 设为 1024m 表示限制 1.024 Byte，这么小的内存， pause 容器一起来就会被 cgroup-oom kill 掉，导致 pod 状态一直处于 ContainerCreating。

这种情况通常会报下面的 event:

``` txt
Pod sandbox changed, it will be killed and re-created。
```

kubelet 报错:

``` txt
to start sandbox container for pod ... Error response from daemon: OCI runtime create failed: container_linux.go:348: starting container process caused "process_linux.go:301: running exec setns process for init caused \"signal: killed\"": unknown
```

## 拉取镜像失败

镜像拉取失败也分很多情况，这里列举下:

* 配置了错误的镜像
* Kubelet 无法访问镜像仓库（比如默认 pause 镜像在 gcr.io 上，国内环境访问需要特殊处理）
* 拉取私有镜像的 imagePullSecret 没有配置或配置有误
* 镜像太大，拉取超时（可以适当调整 kubelet 的 --image-pull-progress-deadline 和 --runtime-request-timeout 选项）

## CNI 网络错误

如果发生 CNI 网络错误通常需要检查下网络插件的配置和运行状态，如果没有正确配置或正常运行通常表现为:

* 无法配置 Pod 网络
* 无法分配 Pod IP

## controller-manager 异常

查看 master 上 kube-controller-manager 状态，异常的话尝试重启。

## 安装 docker 没删干净旧版本

如果节点上本身有 docker 或者没删干净，然后又安装 docker，比如在 centos 上用 yum 安装:

``` bash
yum install -y docker
```

这样可能会导致 dockerd 创建容器一直不成功，从而 Pod 状态一直 ContainerCreating，查看 event 报错:

```
  Type     Reason                  Age                     From                  Message
  ----     ------                  ----                    ----                  -------
  Warning  FailedCreatePodSandBox  18m (x3583 over 83m)    kubelet, 192.168.4.5  (combined from similar events): Failed create pod sandbox: rpc error: code = Unknown desc = failed to start sandbox container for pod "nginx-7db9fccd9b-2j6dh": Error response from daemon: ttrpc: client shutting down: read unix @->@/containerd-shim/moby/de2bfeefc999af42783115acca62745e6798981dff75f4148fae8c086668f667/shim.sock: read: connection reset by peer: unknown
  Normal   SandboxChanged          3m12s (x4420 over 83m)  kubelet, 192.168.4.5  Pod sandbox changed, it will be killed and re-created.
```

可能是因为重复安装 docker 版本不一致导致一些组件之间不兼容，从而导致 dockerd 无法正常创建容器。

## 存在同名容器

如果节点上已有同名容器，创建 sandbox 就会失败，event:

```
  Warning  FailedCreatePodSandBox  2m                kubelet, 10.205.8.91  Failed create pod sandbox: rpc error: code = Unknown desc = failed to create a sandbox for pod "lomp-ext-d8c8b8c46-4v8tl": operation timeout: context deadline exceeded
  Warning  FailedCreatePodSandBox  3s (x12 over 2m)  kubelet, 10.205.8.91  Failed create pod sandbox: rpc error: code = Unknown desc = failed to create a sandbox for pod "lomp-ext-d8c8b8c46-4v8tl": Error response from daemon: Conflict. The container name "/k8s_POD_lomp-ext-d8c8b8c46-4v8tl_default_65046a06-f795-11e9-9bb6-b67fb7a70bad_0" is already in use by container "30aa3f5847e0ce89e9d411e76783ba14accba7eb7743e605a10a9a862a72c1e2". You have to remove (or rename) that container to be able to reuse that name.
```

关于什么情况下会产生同名容器，这个有待研究。
