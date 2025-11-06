# 容器化声明式管理 nftables

## 概述

在前面一些章节中我们用到了 nftables，如使用 nftables 配置防火墙规则、配置主路由出公网的 IP MASQUERADE，这些 nftables 的配置我们并没有容器化，而是直接写到宿主机的 `/etc/nftables.conf` 中，如果需要修改或新增规则，都需要手动去修改该文件并执行 `nft -f /etc/nftables.conf` 来生效。

实际上 nftables 也可以进行容器化，这样会带来一些好处：
1. 减少非容器化管理的内容，降低维护的工作量。
2. 后续可跟其它容器化应用一样，接入 GitOps 来进一步提升配置管理的便利性。

## docker-nftables 开源项目

nftables 是内核 netfilter 的功能模块，与 iptables 类似，也需要一个 client 来操作规则，容器化 nftables 除了要保证宿主机内核支持 nftables 外，还需要保证容器内有 nftables 的 `nft` 命令工具，而 [docker-nftables](https://github.com/imroc/docker-nftables) 项目提供了该容器镜像，本文也将使用该项目自动构建出的容器镜像来容器化 nftables 配置。

开源项目地址：https://github.com/imroc/docker-nftables

## 目录结构

```txt
nftables
├── config
│   ├── firewall.conf
│   └── ppp.conf
├── daemonset.yaml
├── entrypoint.sh
└── kustomization.yaml
```

> 可以将 `nftables` 按 `table` 维度拆分成单独的文件进行维护，放到 `config` 目录下。

## 配置 entrypoint.sh

创建 `entrypoint.sh`，该脚本用作 Pod 启动入口：

```bash showLineNumbers title="entrypoint.sh"
#!/bin/bash

set -ex

nft -c -f /etc/nftables.conf
nft -f /etc/nftables.conf

sleep infinity
```

要点解析：

* `set -ex` 是为了将执行的命令展示到 Pod 标准输出，并让在 nftables 规则有误的情况下，提前退出脚本。
* 在真正设置 nftables 规则之前，先用 `nft -c -f /etc/nftables.conf` 检查语法是否正确，如果有误就先退出，避免 “部分成功”。
* 结尾处使用 `sleep infinity` 让 Pod 保持不退出的状态，避免 Pod 被重新拉起（DaemonSet/Deployment 下容器的 `restartPolicy` 只能为 `Always`）

## 配置 daemonset.yaml

<FileBlock showLineNumbers file="home-network/nftables.yaml" title="daemonset.yaml" />

要点解析：

* 挂载 `entrypoint.sh` 脚本并指定启动入口为该脚本。
* 将 nftables 配置挂载到 `/etc/nftables` 目录下，该目录下的 `*.conf` 和 `*.nft` 文件会被自动 include 合并到 nftables 配置中。

## 配置 kustomization.yaml

```yaml showLineNumbers title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

configMapGenerator:
  - name: nftables-config
    files:
      - config/firewall.conf
      - config/ppp.conf
  - name: nftables-script
    files:
      - entrypoint.sh

namespace: default
```
