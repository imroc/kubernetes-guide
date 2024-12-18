# 快速安装

## 概述

本文主要给出一些具体的安装实践案例供大家参考。

## 安装精简版 k3s

有时候个人开发者只想用 k3s 来替代容器来部署一些应用，不需要 k8s 很多复杂的功能，此时在安装的时候可以禁用很多不需要的组件，节约服务器资源：

```bash
$ curl -sfL https://get.k3s.io | sh -s - server \
  --disable-kube-proxy \
  --disable-cloud-controller \
  --disable-network-policy \
  --disable-helm-controller \
  --disable=traefik,local-storage,metrics-server,servicelb,coredns
```

> 可根据自身需求，删除部分 `disable` 参数来启用相关功能。

## 国内环境安装 k3s

国内环境需替换安装脚本地址和依赖的默认 registry:

```bash showLineNumbers
# highlight-next-line
INSTALL_K3S_MIRROR=cn curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | sh -s - server \
  --disable-cloud-controller \
  --disable-network-policy \
  --disable-helm-controller \
  --disable=traefik,local-storage,metrics-server \
  # highlight-next-line
  --system-default-registry=registry.cn-hangzhou.aliyuncs.com
```

* 国内环境使用 k3s 默认安装脚本网络不通，使用 mirror 脚本替代。
* 通过 `--system-default-registry` 修改依赖的默认 registry，比如 pause、coredns、svclb 等依赖镜像，会从 rancher 的 dockerhub 镜像仓库拉取，国内环境可能拉取不到 dockerhub 镜像，指定为阿里云的 mirror 镜像仓库。


## 路由器上安装极简 k3s

将 k3s 安装在自家路由器上，统一用声明式的 yaml 管理路由器的应用和功能，方便刷机后也能重新一键安装回来：

```bash showLineNumbers
INSTALL_K3S_MIRROR=cn curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | sh -s - server \
  # highlight-start
  --node-ip=10.10.10.2 \
  --tls-san=10.10.10.2 \
  --tls-san-security=false \
  # highlight-end
  --disable-cloud-controller \
  --disable-network-policy \
  --disable-helm-controller \
  --disable=traefik,local-storage,metrics-server \
  --system-default-registry=registry.cn-hangzhou.aliyuncs.com
```

> 如果是主路由，公网 ip 每次拨号会变，而 k3s 启动时会获取到外网 ip 作为 hostname，用导出的 kubeconfig 去访问 apiserver 时，会报证书问题（签发时不包含重新拨号之后的外网 ip），可以用 `--node-ip`、`--tls-san` 强制指定一下路由器使用的静态内网 IP。

## 延长证书有效期

k3s 签发的证书默认有效期是 1 年，到期前 90 天之后重启 k3s 会自动续期，但在某些场景无需严格考虑证书安全，比如家用路由器，可自定义下生成的证书的有效期。

配置方法是创建 `/etc/default/k3s` 文件，添加如下内容：

```env
CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS=3650
```

> 3650 天 = 10 年

然后手动触发证书轮转并重启：

```bash
k3s certificate rotate
systemctl restart k3s
```

## 禁止驱逐

k8s 会自动检测 node 内存和存储空间，超过阈值就会触发驱逐，如果 k3s 只是单机使用，驱逐毫无意义且影响使用，这时可以禁用驱逐。

在 `/etc/rancher/k3s/config.yaml` 中添加如下配置：

```yaml
kubelet-arg:
  - "eviction-hard=memory.available<1Mi,nodefs.available<1Mi" # 禁用驱逐
```

## 禁用镜像清理

当存储空间不够时 k3s 会尝试自动清理镜像来释放空间，可能导致不希望被清理的镜像被清理掉，这时可以禁用镜像清理。

在 `/etc/rancher/k3s/config.yaml` 中添加如下配置：

```yaml
kubelet-arg:
  - "image-gc-high-threshold=100" # 禁用 image gc
```

## 允许指定 sysctl

如果有些 Pod 的 `securityContext` 指定了一些不安全的内核参数，Pod 就会启动失败（比如 svclb 的 Pod 指定了 `net.ipv4.ip_forward` 这个内核参数）。

要启用这些用到的不安全内核参数，在 `/etc/rancher/k3s/config.yaml` 中添加类似如下的配置：

```yaml
kubelet-arg:
  - "allowed-unsafe-sysctls=net.ipv6.*,net.ipv4.*"
```
