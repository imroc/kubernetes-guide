# 在容器内构建镜像

## 概述
在富容器中的日常开发中，还可能涉及构建容器，还有就是富容器自身也需要实现自举，即在富容器内编译自己的新版本镜像。本文将介绍如何实现在容器内编译容器。

## 使用 nerdctl 构建镜像

如果是在容器内编译 devcontainer 自身的镜像，可以用 [nerdctl](https://github.com/containerd/nerdctl) 替代 docker 命令来编译，编译时指定 buildkit 的 unix 套接字地址：

```bash
nerdctl build --buildkit-host=unix:///host/run/buildkit/buildkitd.sock -t your.registry.com/private/devcontainer:latest .
```

> buildkit 的 unix 套接字地址默认是 `/run/buildkit/buildkitd.sock`，但 buildkitd 是运行在宿主机上的，容器内并没有这个文件。而容器内可以将宿主机的根路径挂载到容器内的 `/host`，所以这里指定 buildkitd 的 unix 套接字地址为 `unix:///host/run/buildkit/buildkitd.sock`。

## nerdctl 配置文件

平时使用 nerdctl 查看容器和镜像时，我们往往希望是看到的是 k3s 里用到的镜像和容器列表，我们可以给 nerdctl 配置默认的 namespace 和运行时 unix 套接字地址来实现。

nerdctl 的配置文件路径是 `/etc/nerdctl/nerdctl.toml`，配置格式参考 [官网文档](https://github.com/containerd/nerdctl/blob/main/docs/config.md)。

配置方法：

```toml title="nerdctl.toml"
address        = "unix:///host/run/k3s/containerd/containerd.sock"
namespace      = "k8s.io"
```

## 使用 docker 构建镜像
有时候我们也需要用 docker 来构建镜像（很多开源项目中依赖这个），我们可以将容器内安装的 docker 命令放到 `PATH` 之外的目录，如 `/bins/docker`，然后再写个名为 `docker` 的脚本文件放到 `/usr/local/bin/docker`：

```bash title="docker"
#!/bin/bash

/bins/docker -H unix:///host/var/run/docker.sock $@
```

这样就可以利用 docker 脚本调用真正的 docker 命令，自动加上 dockerd 的 unix 的套接字地址，该地址指向宿主机上的 `docker.sock` 文件。
