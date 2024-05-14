# 智能家居助手：HomeAssistant

## HomeAssistant 介绍

## 开源项目

* 项目地址：https://github.com/home-assistant/core
* 官网：https://www.home-assistant.io/

## 目录结构

```txt
home-assistant
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/home-assistant.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```

## 访问 HomeAssistant

访问入口：http://`路由器内网 IP`:8123/
