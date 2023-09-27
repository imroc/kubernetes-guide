# Unable to mount volumes

## 问题现象

Pod 一直 Pending，有类似如下 Warning 事件:

```txt
Unable to mount volumes for pod "es-0_prod(0f08e3aa-aa56-11ec-ab5b-5254006900dd)": timeout expired waiting for volumes to attach or mount for pod "prod"/"es-0". list of unmounted volumes=[applog]. list of unattached volumes=[applog default-token-m7bf7]
```

## 快速排查

首选根据 Pod 事件日志的提示进行快速排查，观察下 Pod 事件日志，除了 `Unable to mount volumes` 是否还有其它相关日志。

### MountVolume.WaitForAttach failed

Pod 报类似如下事件日志:

```txt
MountVolume.WaitForAttach failed for volume "pvc-067327ac-00ec-11ec-bdce-5254001a6990" : Could not find attached disk("disk-68i8q1gq"). Timeout waiting for mount paths to be created.
```

说明磁盘正在等待被 attach 到节点上，这个操作通常是云厂商的 provisioner 组件去调用磁盘相关 API 来实现的 (挂载磁盘到虚拟机)。可以检查下节点是否有被挂载该磁盘，云上一般是在云控制台查看云服务器的磁盘挂载情况。

出现这种一般是没有挂载上，可以先自查一下是否遇上了这种场景:
1. pod 原地重启，detach 磁盘时超时。
2. 容器原地快速重启，controller-manager 误以为已经 attach 就没调用 CSI 去 attach 磁盘，并标记 node 为 attached，记录到 node status 里。
3. kubelet watch 到 node 已经 attach 了，取出磁盘信息准备拿来 mount，但是发现对应盘符找不到，最后报错。

如果是，只有重建 pod 使其调度到其它节点上，重新挂载。

如果不是，有可能是 CSI 插件本身的问题，可以反馈给相关技术人员。

## 排查思路

如果无法通过事件快速排查，可以尝试从头开始一步步查，这里分享排查思路。

1. 查看 pod 定义，看看有哪些 volume:
    ```bash
    kubectl get pod $POD_NAME -o jsonpath='{.spec.volumes}' | jq
    ```
    ```json
    [
      {
        "name": "applog",
        "persistentVolumeClaim": {
          "claimName": "applog-es-0"
        }
      },
      {
        "name": "default-token-m7bf7",
        "secret": {
          "defaultMode": 420,
          "secretName": "default-token-m7bf7"
        }
      }
    ]
    ```
2. 检查事件中 `list of unmounted volumes` 对应的 volume 是哪个，通常是对应一个 pvc，拿到对应 pvc 名称。
3. 检查 pvc 状态是否为 `Bound`:
    ```bash
    $ kubectl get pvc applog-es-0
    NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
    applog-es-0   Bound    pvc-067327ac-00ec-11ec-bdce-5254001a6990   100Gi      RWO            cbs-stata      215d
    ```
4. 如果没有 `Bound`，说明还没有可用的 PV 能绑定，如果 PV 是手动创建，需要创建下，如果是用 `StorageClass` 自动创建而没有创建出来，可以 describe 一下 pvc，看下事件日志的提示，应该就可能看出原因，如果还不能看出来，就看下对应 provisoner 组件的日志。
5. 如果是 `Bound` 状态，说明存储已经准备好了，出问题的是挂载，要么是 attach 失败，要么是 mount 失败。如果是 attach 失败，可以结合 `controller-manager` 和 CSI 插件相关日志来分析，如果是 mount 失败，可以排查下 kubelet 的日志。
