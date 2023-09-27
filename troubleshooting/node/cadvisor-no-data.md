# cAdvisor 无数据

## 可能原因

### 修改容器数据盘后未重启 kubelet

如果修改过容器数据盘 (docker root)，重启了容器运行时，但又没驱逐和重启 kubelet，这时 kubelet 就可能无法正常返回 cAdvisor 数据，日志报错:

```txt
Mar 21 02:59:26 VM-67-101-centos kubelet[714]: E0321 02:59:26.320938     714 manager.go:1086] Failed to create existing container: /kubepods/burstable/podb267f18b-a641-4004-a660-4c6a43b6e520/03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03: failed to identify the read-write layer ID for container "03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03". - open /var/lib/docker/image/overlay2/layerdb/mounts/03164d8f0d1f55a285b50b2117d6fdb2c33d2fa87f46dba0f43b806017607d03/mount-id: no such file or directory
```

如何确认？可以看下数据盘是否修改过:

```bash
$ docker info
...
Docker Root Dir: /data/bcs/service/docker
...
```

确认下容器运行时启动时间是否晚于 kubelet:

```txt
● kubelet.service - kubelet
   Loaded: loaded (/usr/lib/systemd/system/kubelet.service; enabled; vendor preset: disabled)
   Active: active (running) since Fri 2022-01-14 14:39:52 CST; 2 months 6 days ago
   
   
● dockerd.service - dockerd
Loaded: loaded (/usr/lib/systemd/system/dockerd.service; enabled; vendor preset: disabled)
Active: active (running) since Fri 2022-01-14 14:41:45 CST; 2 months 6 days ago
```

如果都是，可能就是因为修改了容器数据盘路径并且没有重启 kubelet。

解决方案就是: 对 Node 进行驱逐，让存量旧 Pod 漂移到其它节点，最后重启下 kubelet。