# 磁盘爆满

## 什么情况下磁盘可能会爆满 ？

kubelet 有 gc 和驱逐机制，通过 `--image-gc-high-threshold`, `--image-gc-low-threshold`, `--eviction-hard`, `--eviction-soft`, `--eviction-minimum-reclaim` 等参数控制 kubelet 的 gc 和驱逐策略来释放磁盘空间，如果配置正确的情况下，磁盘一般不会爆满。

通常导致爆满的原因可能是配置不正确或者节点上有其它非 K8S 管理的进程在不断写数据到磁盘占用大量空间导致磁盘爆满。

## 磁盘爆满会有什么影响 ？

影响 K8S 运行我们主要关注 kubelet 和容器运行时这两个最关键的组件，它们所使用的目录通常不一样，kubelet 一般不会单独挂盘，直接使用系统磁盘，因为通常占用空间不会很大，容器运行时单独挂盘的场景比较多，当磁盘爆满的时候我们也要看 kubelet 和 容器运行时使用的目录是否在这个磁盘，通过 `df` 命令可以查看磁盘挂载点。

### 容器运行时使用的目录所在磁盘爆满

如果容器运行时使用的目录所在磁盘空间爆满，可能会造成容器运行时无响应，比如 docker，执行 docker 相关的命令一直 hang 住， kubelet 日志也可以看到 PLEG unhealthy，因为 CRI 调用 timeout，当然也就无法创建或销毁容器，通常表现是 Pod 一直 ContainerCreating 或 一直 Terminating。

docker 默认使用的目录主要有:

* `/var/run/docker`: 用于存储容器运行状态，通过 dockerd 的 `--exec-root` 参数指定。
* `/var/lib/docker`: 用于持久化容器相关的数据，比如容器镜像、容器可写层数据、容器标准日志输出、通过 docker 创建的 volume 等

Pod 启动可能报类似下面的事件:

``` txt
  Warning  FailedCreatePodSandBox    53m                 kubelet, 172.22.0.44  Failed create pod sandbox: rpc error: code = DeadlineExceeded desc = context deadline exceeded
```

``` txt
  Warning  FailedCreatePodSandBox  2m (x4307 over 16h)  kubelet, 10.179.80.31  (combined from similar events): Failed create pod sandbox: rpc error: code = Unknown desc = failed to create a sandbox for pod "apigateway-6dc48bf8b6-l8xrw": Error response from daemon: mkdir /var/lib/docker/aufs/mnt/1f09d6c1c9f24e8daaea5bf33a4230de7dbc758e3b22785e8ee21e3e3d921214-init: no space left on device
```

``` txt
  Warning  Failed   5m1s (x3397 over 17h)  kubelet, ip-10-0-151-35.us-west-2.compute.internal  (combined from similar events): Error: container create failed: container_linux.go:336: starting container process caused "process_linux.go:399: container init caused \"rootfs_linux.go:58: mounting \\\"/sys\\\" to rootfs \\\"/var/lib/dockerd/storage/overlay/051e985771cc69f3f699895a1dada9ef6483e912b46a99e004af7bb4852183eb/merged\\\" at \\\"/var/lib/dockerd/storage/overlay/051e985771cc69f3f699895a1dada9ef6483e912b46a99e004af7bb4852183eb/merged/sys\\\" caused \\\"no space left on device\\\"\""
```

Pod 删除可能报类似下面的事件:

``` txt
Normal  Killing  39s (x735 over 15h)  kubelet, 10.179.80.31  Killing container with id docker://apigateway:Need to kill Pod
```

### kubelet 使用的目录所在磁盘爆满

如果 kubelet 使用的目录所在磁盘空间爆满(通常是系统盘)，新建 Pod 时连 Sandbox 都无法创建成功，因为 mkdir 将会失败，通常会有类似这样的 Pod 事件:

``` txt
  Warning  UnexpectedAdmissionError  44m                 kubelet, 172.22.0.44  Update plugin resources failed due to failed to write checkpoint file "kubelet_internal_checkpoint": write /var/lib/kubelet/device-plugins/.728425055: no space left on device, which is unexpected.
```

kubelet 默认使用的目录是 `/var/lib/kubelet`， 用于存储插件信息、Pod 相关的状态以及挂载的 volume (比如 `emptyDir`, `ConfigMap`, `Secret`)，通过 kubelet 的 `--root-dir` 参数指定。

## 如何分析磁盘占用 ?

* 如果运行时使用的是 Docker，请参考本书 排错技巧: 分析 Docker 磁盘占用 (TODO)

## 如何恢复 ？

如果容器运行时使用的 Docker，我们无法直接重启 dockerd 来释放一些空间，因为磁盘爆满后 dockerd 无法正常响应，停止的时候也会卡住。我们需要先手动清理一点文件腾出空间好让 dockerd 能够停止并重启。

可以手动删除一些 docker 的 log 文件或可写层文件，通常删除 log:

``` bash
$ cd /var/lib/docker/containers
$ du -sh * # 找到比较大的目录
$ cd dda02c9a7491fa797ab730c1568ba06cba74cecd4e4a82e9d90d00fa11de743c
$ cat /dev/null > dda02c9a7491fa797ab730c1568ba06cba74cecd4e4a82e9d90d00fa11de743c-json.log.9 # 删除log文件
```

* **注意:** 使用 `cat /dev/null >` 方式删除而不用 `rm`，因为用 rm 删除的文件，docker 进程可能不会释放文件，空间也就不会释放；log 的后缀数字越大表示越久远，先删除旧日志。

然后将该 node 标记不可调度，并将其已有的 pod 驱逐到其它节点，这样重启 dockerd 就会让该节点的 pod 对应的容器删掉，容器相关的日志(标准输出)与容器内产生的数据文件(没有挂载 volume, 可写层)也会被清理：

``` bash
kubectl drain <node-name>
```

重启 dockerd:

``` bash
systemctl restart dockerd
# or systemctl restart docker
```

等重启恢复，pod 调度到其它节点，排查磁盘爆满原因并清理和规避，然后取消节点不可调度标记:

``` bash
kubectl uncordon <node-name>
```

## 如何规避 ？

正确配置 kubelet gc 和 驱逐相关的参数，即便到达爆满地步，此时节点上的 pod 也都早就自动驱逐到其它节点了，不会存在 Pod 一直 ContainerCreating 或 Terminating 的问题。
