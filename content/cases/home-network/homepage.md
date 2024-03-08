# 家庭导航页：homepage

## 概述

随着路由器上部署的服务越来越多，记不住每个服务的页面地址，可以部署一个 homepage 并暴露 80 端口，进去后就是家里的服务导航页，可以快速跳转家里的各个服务的页面。

## 开源项目

* 项目地址：https://github.com/gethomepage/homepage
* 官网：https://gethomepage.dev/latest/

## 目录结构

```txt
homepage
├── config
│   ├── bookmarks.yaml
│   ├── services.yaml
│   ├── settings.yaml
│   └── widgets.yaml
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 homepage 配置文件

```yaml title="config/bookmarks.yaml"
# https://gethomepage.dev/latest/configs/bookmarks/
```

```yaml title="config/settings.yaml"
# https://gethomepage.dev/latest/configs/settings/

providers:
  openweathermap: openweathermapapikey
  weatherapi: weatherapiapikey
```

```yaml title="config/widgets.yaml"
# https://gethomepage.dev/latest/widgets/

- resources:
    cpu: true
    memory: true
    disk: /
```

```yaml title="config/services.yaml"
# https://gethomepage.dev/latest/configs/services/

- 家庭主页:
    - Jellyfin:
        href: http://10.10.10.2:8096/
        description: 家庭影院
    - Grafana:
        href: http://10.10.10.2:3000/
        description: 监控面板
    - VictoriaMetrics:
        href: http://10.10.10.2:8428/
        description: 监控工具
    - AriaNg:
        href: http://10.10.10.2:6880/
        description: 离线下载
    - AList:
        href: http://10.10.10.2:5244/
        description: 云盘
    - HomeAssistant:
        href: http://10.10.10.2:8123/
        description: Home Assistant
    - Filebrowser:
        href: http://10.10.10.2:8567/
        description: 文件管理
```

* `services.yaml` 是定义导航页列表的配置文件，可以根据自己家里的情况进行 DIY。

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/homepage.yaml" />

## 准备 kustomization.yaml

```txt
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default

configMapGenerator:
  - name: homepage-config
    files:
      - config/services.yaml
      - config/settings.yaml
      - config/bookmarks.yaml
      - config/widgets.yaml
```

## 访问 Homepage

访问入口：http://`路由器内网 IP`
