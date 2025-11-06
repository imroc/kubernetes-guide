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

## 配置网盘

进入【AList 管理】页面，添加存储：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522095000.png)

选择对应的驱动，AList 支持很多网盘和对象存储，具体配置方法可在 [AList 使用指南](https://alist.nn.ci/zh/guide/) 中找到对应存储驱动的配置步骤。

## 与 Aria2 联动

AList 挂载的网盘中的文件可直接发送给 Aria2 打包下载，下面介绍配置方法。

进入主页，右下角点击本地设置:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522094849.png)

输入 Aria2 RPC 的地址和密钥：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522095547.png)

进入挂载的网盘目录，选中要下载的文件，点击【发送到 Aria2】:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F22%2F20240522095724.png)

然后你就进入 Aria2 的 Web 页面就可以观察到你的 Aria2 正在努力帮你离线下载文件啦。
