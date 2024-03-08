# 网盘挂载工具：AList

## 为什么需要 AList ？

网上有海量的视频资源都通过网盘共享，我们可以转存到自己网盘，然后再通过 alist 挂载到路由器，直接在线观看网盘里的视频，如果网盘限速或宽带不够，也可以结合 aria2 将网盘里的文件离线下载到路由器本地。

## 开源项目

AList 的项目地址：https://github.com/alist-org/alist

## 目录结构

```txt
alist
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/alist.yaml" />

## 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```

## 访问 Alist

访问入口：http://`路由器内网 IP`:5244/
