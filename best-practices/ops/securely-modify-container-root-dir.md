# 安全变更容器数据盘路径

本文介绍如何安全的对容器的数据盘路径进行变更。

## Docker 运行时

### 注意事项

如果节点上容器运行时是 Docker，想要变更 Docker Root Dir，需要谨慎一点。如果操作不慎，可能造成采集不到容器监控数据，因为容器监控数据由 kubelet 的 cadvisor 模块提供，而由于 docker 没有实现 CRI 接口，cadvisor 会对 Docker 有一些特殊处理: 在刚启动时，通过 `docker info` 获取 `Docker Root Dir` 路径，后续逻辑会依赖这个路径。

如果在 kubelet 运行过程中，改了 `Docker Root Dir`，cadvisor 并不会更新路径，仍然认为路径是之前的，就会造成 kubelet 不能正常返回监控指标并且报类似如下的错:

```txt
Mar 21 02:59:26 VM-67-101-centos kubelet[714]: E0321 02:59:26.320938     714 manager.go:1086] Failed to create existing container: /kubepods/burstable/podb267f18b-a641-4004-a660-4c6a43b6e520/03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03: failed to identify the read-write layer ID for container "03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03". - open /var/lib/docker/image/overlay2/layerdb/mounts/03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03/mount-id: no such file or directory
```

> 参考 [排障案例: cAdvisor 无数据](../../troubleshooting/node/cadvisor-no-data.md)。

### 变更步骤

1. 驱逐节点(`kubectl drain NODE`)，让存量 Pod 漂移到其它节点上，参考 [安全维护或下线节点](securely-maintain-or-offline-node.md)。
2. 修改 dockerd 配置文件 `/etc/docker/daemon.json`:
    ```json
    {
      "graph": "/data/docker"
    }
    ```
3. 重启 dockerd:
    ```bash
    systemctl restart docker
    # systemctl restart dockerd
    ```
4. 重启 kubelet
    ```bash
    systemctl restart kubelet
    ```
5. 节点恢复为可调度状态: `kubectl uncordon NODE`。

## 其它运行时

其它运行时都实现了 CRI 接口，变更容器 Root Dir 就不需要那么严谨，不过安全起见，还是建议先安全的将节点上存量 Pod 驱逐走(参考 [安全维护或下线节点](securely-maintain-or-offline-node.md))，然后再修改运行时配置并重启容器运行时。

配置修改方式参考对应运行时的官方文档，这里以常用的 `containerd` 为例:

1. 修改 `/etc/containerd/config.toml`:
    ```toml
    root = "/data/containerd"
    ```
2. 重启 containerd:
    ```bash
    systemctl restart containerd
    ```
3. 节点恢复为可调度状态: `kubectl uncordon NODE`。