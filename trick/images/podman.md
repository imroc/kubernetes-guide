# 使用 Podman 构建镜像

## 概述

[Podman](https://podman.io/) 是一个类似 docker 的工具，可以运行容器，也可以构建镜像，甚至可以像 docker 一样支持构建多平台镜像。如今 Docker Desktop 已经宣布收费，可以考虑使用 Podman 来替代。

## 安装

参考 [官方安装文档](https://podman.io/getting-started/installation)，我使用的是 Mac，安装很简单:

```bash
brew install podman
```

由于 podman 是基于 Linux 的，安装在 Mac 需要先启动它的虚拟机:

```bash
podman machine init
podman machine start
```

最后检查下是否 ok:

```bash
podman info
```

## Podman 构建镜像的背后

Podman 构建镜像在背后实际是利用了 [Buildah](https://buildah.io/) 这个工具去构建，只是封装了一层，更容易使用了。

## Podman 构建镜像的方法

`podman build` 基本兼容 `docker build`，所以你可以像使用 docker 一样去使用 podman 构建镜像。

## FAQ

### 未启动虚拟机导致报错

执行 podman 命令是，遇到 `connect: no such file or directory` 的报错:

```bash
$ podman build --platform=linux/amd64 . -t imroc/crontab:centos -f centos.Dockerfile
Cannot connect to Podman. Please verify your connection to the Linux system using `podman system connection list`, or try `podman machine init` and `podman machine start` to manage a new Linux VM
Error: unable to connect to Podman socket: Get "http://d/v4.0.2/libpod/_ping": dial unix ///var/folders/91/dsfxsd7j28z2mxl7vm91mjg40000gn/T/podman-run--1/podman/podman.sock: connect: no such file or directory
```

通常是因为在非 Linux 的系统上，没有启动 podman linux 虚拟机导致的，启动下就可以了。

### 代理导致拉取镜像失败

使用 podman 构建镜像或直接拉取镜像的过程中，遇到这种报错:

```txt
Error: error creating build container: initializing source docker://centos:8: pinging container registry registry-1.docker.io: Get "https://registry-1.docker.io/v2/": proxyconnect tcp: dial tcp 127.0.0.1:12639: connect: connection refused
```

通常是因为启动 podman 虚拟机时，终端上有 HTTP 代理的环境变量，可以销毁虚拟机，重新启动，启动前确保当前终端没有 HTTP 代理的环境变量。

## 参考资料

* [Migrating from Docker to Podman](https://marcusnoble.co.uk/2021-09-01-migrating-from-docker-to-podman/)