# 离线下载工具：qBittorrent

## 概述

当我们刷到好看的剧或电影，找资源时可能经常找的是种子或磁力链接，而 qBittorrent 正是专门这类资源的工具，还提供了其它丰富的功能，比如 RSS 订阅自动下载最新集到指定目录，结合 Jellyfin，实现自动追剧（无需视频会员，愉快的追剧）。

## 目录结构

```txt
aria2
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/qbittorrent.yaml" />

* `PUID` 和 `PGID` 都设为 0 (root)，避免下载到挂载的 `/downloads` 目录因权限问题而导致下载失败。
* `WEBUI_PORT` 是 web 版界面的端口，可自行改一个不冲突的端口。
* `TORRENTING_PORT` 为 torrent 监听端口，默认 16881，由于我的 Aria2 的 torrent 也用的这个端口，故改成了其它不冲突的端口。

## 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```

## 访问 qBittorrent

访问入口：http://`路由器内网 IP`:9367/

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027164741.png)

## 自动追剧

qBittorrent 支持 RSS 订阅来实现剧集更新后自动下载最新集。

这里以 [domp4](https://mp4us.com) 上的片源为例，要 RSS 订阅自动下载 domp4 上的资源，首先需要将片源信息转换成 RSS，而 [RSSHub](https://docs.rsshub.app/zh/) 正是将各个热门网站的信息转换成 RSS 的开源工具，当然也包括 domp4 的片源，参考[官网文档](https://docs.rsshub.app/zh/routes/multimedia#domp4-%E5%BD%B1%E8%A7%86)。

不过有些站点的 RSS 不推荐用 RSSHub 官网的公共实例，而用国内开发者维护的公共实例，因为可能由于官方公共实例网络环境或被限频等因素导致拿不到 RSS，关于公共实例参考 [RSSHub 官网文档：公共实例](https://docs.rsshub.app/zh/guide/instances) 。

我个人用的 `yangzhi.app` 这个公共实例，下面分享如何利用这个公共实例订阅 domp4 上的剧集。

点右上角的 【rss】，然后点击【新 RSS 订阅】：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027170127.png)

会弹出一个输入框，输入 RSS 地址：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027170318.png)

输入：`https://yangzhi.app/domp4/detail/xxx`。

将 `xxx` 替换为剧集在 domp4 上的 id，该 id 的获取方法是在剧集下载列表页面 URL 后缀，比如 `凡人修仙传` 的地址是 https://www.mp4us.com/html/9DvTT8bbbbb8.html，所以它的 id 是 `9DvTT8bbbbb8`，对应的 RSS 地址就是 `https://yangzhi.app/domp4/detail/9DvTT8bbbbb8`。

添加了 RSS 订阅后还需定义下载器规则，点击【RSS 下载器】：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027170754.png)

然后配置下载规则：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027170932.png)

* 如需过滤掉不需要的内容，可勾选【使用正则表达式】，我这里不需要凡人修仙传的重制版，所以用正则过滤了下。
* 勾选【保存到其它目录】，给剧集单独指定一个目录，该目录可与 Jellyfin 共享挂载（通过 hostPath），qBittorrent 自动下载最新集后，Jellyfin 也会自动搜刮剧集信息并在 Jellyfin 上展示更新的剧集信息。
* 【对以下订阅源应用规则】勾选前面创建的 RSS 订阅名称，表示当该 RSS 订阅规则检查到资源更新时，qBittorrent 将自动下载资源到指定目录。

自动下载规则配置好后，不一定生效，还需确保两个全局开关打开，点击设置图标：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027171520.png)

确保这两个勾选上：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F10%2F27%2F20241027171632.png)

大功告成！可以愉快的追剧了。
