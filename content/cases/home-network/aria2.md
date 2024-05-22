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

用浏览器打开 Aria2 的 Web 界面后，在 `AriaNg 设置` 新建 RPC 设置，输入 `Aria2`  的 RPC 地址：`http://<路由器 IP>:6800/jsonrpc`，密码为 yaml 中设置的密码:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522093337.png)

然后就可以在【正在下载】中去新建下载任务了：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522093648.png)

> 按照本文中 yaml 的配置，下载完成的文件会落盘到宿主机的 `/data/media/downloads/completed` 文件夹下。
