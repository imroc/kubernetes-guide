# 家庭 NAS 服务：Samba

## 为什么需要 Samba 服务？

家里有些设备，比如电视机、投影仪，支持通过 Samba 远程读取文件来看路由器磁盘中的视频文件，前提是路由器安装了 Samba 服务（传说中的 NAS 中的一种协议）。

## 开源项目

本文部署的 Samba 服务使用这个开源项目构建的容器镜像：https://github.com/dperson/samba

## 目录结构

```txt
samba
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/samba.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```
