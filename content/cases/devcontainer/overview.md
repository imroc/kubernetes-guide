# 概述

## 什么是富容器开发环境？

众所周知，容器具有环境一致性和可移植性的优势，我们可以利用容器技术，打造自己专属的开发容器，将平时的开发环境依赖都写到 `Dockerfile` 中，最终编译出专属的开发容器镜像。通常开发环境依赖很多，我本人的开发容器镜像编译出来有 30G 左右，这种用于开发，依赖众多的富容器我们就叫它富容器开发环境。

## 容器部署方式

在远程开发机上通过 k3s 部署精简版的 k8s，然后通过 Daemonset 方式声明式部署 devcontainer，网络使用 HostNetwork，无需容器网络，容器内 SSH 监听 22 以外的端口，避免与开发机自身的 SSH 端口冲突。

## 富容器的日常开发方式

在富容器中会启动 SSH，我们的电脑、平板、手机等设备可通过 SSH 登录富容器来进行日常开发：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F28%2F20240528105702.png)

容器内包含日常开发所用到的工具，我本人以前用过很多 IDE 和编辑器，现在使用 Neovim 编辑器作为主力工具，而 Neovim 无需 GUI 界面，通过终端就可以用，所以平时工作大部分操作都在富容器中进行，算力和存储都 offload 到远程的富容器了，不怎么占用本机资源，可以实现多设备轻办公，即使使用低配的平板电脑也能轻松进行超大工程的开发，可随时随地办公。


## Zellij + Neovim 工作流

既然是富容器远程开发环境，我们就需要让终端持久化来“保存现场”，形成我们专属的工作空间，每次登录进去都可以继续上次的工作，不需要每次都要重新打开很多终端。以前我是通过 [tmux](https://github.com/tmux/tmux) 来实现的，后来切换到了 [zellij](https://github.com/zellij-org/zellij)，后者是 Rust 写的后起之秀，比 tmux 更强大，更现代化。

日常开发使用 Neovim 编辑器，基于 [LazyVim](https://github.com/LazyVim/LazyVim) 高度 DIY 定制自己的配置，甚至自己写插件实现日常所需要的需求。，几乎完全替代了以前使用的 JetBrains 全家桶 IDE 和 VSCode。

对于本地的终端软件，这个就无所谓了，只需要用到最基础的功能，macOS 可以用 [iTerm2](https://iterm2.com/)，如果是移动设备，可以用 [Termius](https://termius.com/)。

下面的 GIF 展示了一些基础的使用效果：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F28%2F20240528164435.png)
