# 宿主机安装容器环境

## 概述

宿主机上只需安装容器所需的环境，一是运行容器所需的 k3s，二是编译容器所需的 `buildkit`。

有的同学可能会问：为什么不直接用 docker 构建镜像？

因为 `devcontainer` 可能经常需要随着自身的需求不断迭代，每次修改后构建镜像，然后让 k3s 重启容器来更新 `devcontainer`，而 docker 构建出的镜像无法直接与 k3s 共享，如果用 docker 来构建 `devcontainer`，需要将容器导出然后再导入到 k3s 的 containerd 才能用，而这种几十G的富容器构建本身就很耗时，如果每次还需要再导入导出一次，就更加麻烦也更耗时，还占用更多空间，所以不如直接使用 buildkit 复用 k3s 的 containerd 作为 worker 来构建镜像，这样等镜像构建完，`devcontainer` 重启后就可以自动更新了。

下面将介绍 k3s 和 buildkit 的安装与配置方法。

## 安装 k3s

在宿主机上执行以下命令安装 k3s，用于声明式的方式运行容器:

```bash
curl -sfL https://get.k3s.io | sh -s - server \
  --disable-network-policy \
  --disable-cloud-controller \
  --disable-helm-controller \
  --data-dir=/data/k3s \
  --disable=traefik,local-storage,metrics-server
```

## 安装 buildkit 

通过以下脚本安装最新稳定版的 buildkit 相关二进制到 `/usr/local/bin`:

```bash
getLatestRelease() {
	release=$(curl -s "https://api.github.com/repos/moby/buildkit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
	echo "${release}"
}

# https://github.com/moby/buildkit/releases
BUIDKIT_VERSION=v$(getLatestRelease "moby/buildkit")

mkdir -p /tmp/buildkit
cd /tmp/buildkit
wget -O buildkit.tar.gz https://github.com/moby/buildkit/releases/download/${BUIDKIT_VERSION}/buildkit-${BUIDKIT_VERSION}.linux-$(dpkg --print-architecture).tar.gz
tar -zxvf buildkit.tar.gz
mv ./bin/* /usr/local/bin/
```

## 配置 buildkit

准备 `buildkit.toml` 配置文件：

```toml
root = "/data/buildkit"

[registry."docker.io"]
mirrors = ["your.mirrors.com"]
```

* `root` 指定 buildkit 构建镜像用的数据目录，通常指定到数据盘下的路径，不占用系统盘空间。
* `mirrors` 指定镜像仓库的 mirror，如果需要，可以在这里配置(这里只是构建镜像时用的 mirror，运行容器时的 mirror 是在容器运行时的配置里配)。

准备 `buildkit.service` 配置文件，用于 `systemd` 拉起 `buildkitd` 进程：

```service
[Unit]
Description=BuildKit
Documentation=https://github.com/moby/buildkit

[Service]
ExecStart=/usr/local/bin/buildkitd --oci-worker=false --containerd-worker=true --containerd-worker-addr=/run/k3s/containerd/containerd.sock --containerd-worker-net=host

[Install]
WantedBy=multi-user.target
```

* `ExecStart` 指定 `buaildkitd` 的启动命令，指定使用 k3s 的 containerd 作为 worker 来构建镜像，并且指定 containerd 的 sock 地址。

最后使用以下脚本拷贝配置并启动 `buildkitd`:

```bash
mkdir -p /etc/buildkit
cp ./buildkit.toml /etc/buildkit/
cp ./buildkit.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable buildkit
systemctl start buildkit
```
