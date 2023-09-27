# k3s 安装实践案例

## 概述

本文主要给出一些具体的安装实践案例供大家参考。

## 安装精简版 k3s

有时候个人开发者只想用 k3s 来替代容器来部署一些应用，不需要 k8s 很多复杂的功能，此时在安装的时候可以禁用很多不需要的组件，节约服务器资源：

```bash
$ curl -sfL https://get.k3s.io | sh -s - server \
  --disable-cloud-controller \
  --disable-network-policy \
  --disable-helm-controller \
  --disable=traefik,local-storage,metrics-server,servicelb
```

### 路由器上安装极简 k3s

将 k3s 安装在自家路由器上，统一用声明式的 yaml 管理路由器的应用和功能，方便刷机后也能重新一键安装回来：

```bash
INSTALL_K3S_MIRROR=cn curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | sh -s - server \
  --kubelet-arg="--hostname-override=10.10.10.2" \
  --disable-kube-proxy \
  --disable-cloud-controller \
  --disable-network-policy \
  --disable-helm-controller \
  --disable=traefik,local-storage,metrics-server,servicelb,coredns
```

* 国内家庭网络使用 k3s 默认安装脚本网络不通，使用 mirror 脚本替代。
* 如果是主路由，公网 ip 每次拨号会变，而 k3s 启动时会获取到外网 ip 作为 hostname，用导出的 kubeconfig 去访问 apiserver 时，会报证书问题（签发时不包含重新拨号之后的外网 ip），可以用 `--kubelet-arg` 强制指定一下路由器使用的静态内网 IP。
* 在路由器部署的应用通常只用 HostNetwork，不需要访问 service，可以禁用 kube-proxy 和 coredns。

