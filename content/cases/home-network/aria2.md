# 离线下载工具：Aria2

## 开源项目

本文部署的 Aria2 使用这个开源项目构建的容器镜像：https://github.com/P3TERX/Aria2-Pro-Docker

## 目录结构

```txt
aria2
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/aria2.yaml" />

* 注意修改 yaml 中指定的密码（111111）。

## 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```

## 访问 Aria2

访问入口：http://`路由器内网 IP`:6880/
