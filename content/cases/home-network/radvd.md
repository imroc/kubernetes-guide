# IPv6 路由通告服务：radvd

## 为什么需要 radvd ？

如果你使用主路由方案，宽带也支持 IPv6，且希望家里的设备也都使用 IPv6，那就需要在主路由上部署 radvd 作为路由通告服务，类似 IPv4 的 DHCP 服务，为内网设备分配 IPv6 地址。

## 编译 radvd 镜像

Dockerfile 示例：

```dockerfile showLineNumbers title="Dockerfile"
FROM ubuntu:22.04
RUN apt update -y
RUN apt install -y radvd
ENTRYPOINT ["/usr/sbin/radvd", "--config", "/etc/radvd.d/radvd.conf", "--logmethod", "stderr_clean", "--nodaemon"]
```

## 目录结构

```txt
radvd
├── Dockerfile
├── config
│   └── radvd.conf
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 radvd.conf

<FileBlock showLineNumbers title="config/radvd.conf" file="home-network/radvd.conf" />

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="config/radvd.yaml" file="home-network/radvd.yaml" />

> 使用 `initContainer` 自动修改内核参数以启用 IPv6 转发和接收路由通告（拨号的网卡通过路由通告接收来自运营商分配的 IPv6 地址）。

## 配置 kustomization.yaml

```yaml showLineNumbers title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default

configMapGenerator:
  - name: radvd-config
    files:
      - config/radvd.conf
```
