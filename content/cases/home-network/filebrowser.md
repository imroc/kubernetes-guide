# 文件管理器：filebrowser

## 为什么需要文件管理器？

有时候不希望通过 ssh 登录路由器来操作文件，比如用的是手机，又希望在 aria2 将视频文件离线下载完成后，将文件移动到指定文件夹下，方便家庭影院相关应用能自动识别和搜刮。

## 开源项目

filebrowser 的项目地址：https://github.com/filebrowser/filebrowser

## 准备密码

filebrowser 启动的时候可以指定登录的用户名和密码，密码需要经过 hash，而 filebrowser 自带 hash 子命令，可以先将得到想要设置的密码的 hash 值：

```bash
$ docker run --rm -it --entrypoint="" filebrowser/filebrowser:v2.27.0 sh
$ /filebrowser hash 111111
$2a$10$q/0NjHYLYvP/rcB1VdRBxeVg/AnaPILgMJYyrEnOpw6mhimhsgjeG
```

> 这里以 `111111` 为密码，得到的 hash 值为 `$2a$10$q/0NjHYLYvP/rcB1VdRBxeVg/AnaPILgMJYyrEnOpw6mhimhsgjeG`。

## 目录结构

```txt
filebrowser
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/filebrowser.yaml" />

* 注意替换用户名以及密码的 hash 值。

## 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default
```

## 访问文件管理器

访问入口：http://`路由器内网 IP`:8567/
