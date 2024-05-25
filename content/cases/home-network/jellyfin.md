# 家庭影院服务：Jellyfin

## 概述

如果需要在家中搭建一个家庭影院，Jellyfin 是一个不错的选择。它是一个免费的软件，可以让你在家中的任何设备上观看你的媒体文件。只要将视频文件放入指定目录下，它可以自动搜刮相关的海报、简介等信息，可以在各种设备上播放，包括电视、手机、平板电脑等，所有平台都可以同步播放记录和进度，自动接着之前没看完的继续看。

## 开源项目

Jellyfin 的项目地址是：https://github.com/jellyfin/jellyfin

## 目录结构

```txt
jellyfin
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/jellyfin.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml
```

namespace: default

## 访问 Jellyfin

访问入口：http://`路由器内网 IP`:8096/

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F25%2F20240525112804.png)

## 安装豆瓣刮削器

刮削器在国内还是用豆瓣的数据更好点，可以在登录 Jellyfin 后安装这个插件: https://github.com/cxfksword/jellyfin-plugin-metashark
