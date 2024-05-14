# 家庭 NAS 服务：NFS

## 为什么需要 NFS ？

家里有些设备，比如电视机、投影仪，支持通过 NFS 远程读取文件来看路由器磁盘中的视频文件，前提是路由器安装了 NFS 服务（传说中的 NAS 中的一种协议）。

## 开源项目 

本文部署的 NFS 服务使用这个开源项目构建的容器镜像：https://github.com/ehough/docker-nfs-server

## 目录结构

```txt
nfs
├── config
│   └── exports
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 exports 文件

将要共享的目录写在 `exports` 文件中，每行一个目录，格式为：`目录路径 权限设置`：

```txt
/data/media *(rw,no_root_squash,sync)
/data/media/movies *(rw,no_root_squash,sync)
```

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/nfs.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default

configMapGenerator:
  - name: nfs-exports
    files:
      - config/exports
```

## 注意事项

要求节点有 `nfs` 和 `nfsd` 两个内核模块:

```bash
lsmod | grep nfs
modprobe {nfs,nfsd}
```

如没有，ubuntu 可尝试安装：

```bash
sudo apt-get install nfs-kernel-server
```

需禁用节点自身启动的 nfs-server 和 rpc-statd 服务，避免冲突：

```bash
systemctl disable nfs-server
systemctl stop nfs-server
systemctl stop rpc-statd
```
