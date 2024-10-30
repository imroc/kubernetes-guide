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

### 国内环境安装 k3s

准备 CNI 配置：

<FileBlock showLineNumbers title="10-ptp.conflist" file="cni/ptp.json" />

准备 `k3s-install.sh`  脚本(确保网络可用)：

```bash
curl -sfL https://get.k3s.io -o k3s-install.sh
chmod +x k3s-install.sh
```

安装：

```bash
# 下载 k3s  离线包
mkdir -p /var/lib/rancher/k3s/agent/images/
wget https://ghproxy.com/https://github.com/k3s-io/k3s/releases/latest/download/k3s-airgap-images-amd64.tar -O /var/lib/rancher/k3s/agent/images/k3s-airgap-images-amd64.tar
wget https://ghproxy.com/https://github.com/k3s-io/k3s/releases/latest/download/k3s -O /usr/local/bin/k3s
chmod +x /usr/local/bin/k3s

# 安装 cni 插件二进制和配置
mkdir -p /opt/cni/bin/
wget https://ghproxy.com/https://github.com/containernetworking/plugins/releases/download/v1.3.0/cni-plugins-linux-amd64-v1.3.0.tgz -O /tmp/cni-plugins.tgz
tar -zxvf /tmp/cni-plugins.tgz -C /opt/cni/bin
mkdir -p /etc/cni/net.d/
cp 10-ptp.conflist /etc/cni/net.d/

# 安装 k3s
INSTALL_K3S_SKIP_DOWNLOAD=true ./k3s-install.sh -s - server \
	--data-dir=/data/k3s \
	--disable-network-policy \
	--disable-helm-controller \
	--flannel-backend=none \
	--disable=traefik,local-storage,metrics-server
```

### 延长证书有效期

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
