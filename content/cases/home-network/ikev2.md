# VPN 服务：IKEv2

## 为什么需要 IKEv2

如果需要手机或电脑在外面连上家里的内网，可以在家里路由器搭建 VPN 服务端，苹果的系统(iOS/MacOS)内置了 IKEv2 协议的 VPN 客户端，一些安卓设备也内置了，我们在路由器里部署下支持 IKEv2 协议的 VPN 服务端并暴露出来就可以实现远程连上家里内网了。

## 开源项目 

本文部署的 IKEv2 VPN 服务使用这个开源项目构建的容器镜像：https://github.com/hwdsl2/docker-ipsec-vpn-server

## 使用 nginx + hostPort 暴露 UDP

部署 IKEv2 需要对网络命名空间做很多修改，不建议使用 HostNetwork，避免对其他应用造成影响。所以部署 IKEV2 应使用容器网络，然后用 HostPort 方式暴露 IKEV2 协议所需的两个 UDP 端口，但 HostPort 方式暴露的端口只允许内网访问，如果使用主路由，访问进来的源 IP 是公网 IP，就会不通，可以使用 nginx 来做一个中转，即让 nginx 监听 UDP 端口，再转发给 HostPort 暴露的 UDP。

IKEv2 协议需要使用 500 和 4500 两个 UDP 端口，如果使用主路由方案，nginx 监听的 UDP 就需要使用这两个端口，HostPort 就需要定义为不同的端口，假设 HostPort 分别为 600 和 4600，下面展示了请求链路：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F05%2F13%2F20240513201820.png)

## 部署 nginx

### 目录结构

```bash
nginx
├── config
│   └── nginx.conf
├── daemonset.yaml
└── kustomization.yaml
```

### 准备 nginx.conf

```nginx title="config/nginx.conf"
worker_processes auto;
error_log /dev/stdout debug;
events {
    worker_connections  1024;
}
stream {
    server {
        listen 500 udp;
        proxy_pass 127.0.0.1:600;
    }
    server {
        listen 4500 udp;
        proxy_pass 127.0.0.1:4600;
    }
}
```

### 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/nginx.yaml" />

### 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

configMapGenerator:
  - files:
      - config/nginx.conf
    name: nginx-config

namespace: default
```

## 部署 ikev2 server

### 生成配置

准备环境变量文件：

<FileBlock showLineNumbers title="config/vpn.env" file="home-network/vpn.env" />

再准备一个存储自动生成的 VPN 配置的目录：

```bash
mkdir -p config/ikev2-vpn-data
```

然后使用 docker 运行并引用环境变量文件，生成 VPN 配置：

```bash
docker run --rm -it \
    --name ipsec-vpn-server \
    --env-file ./vpn.env \
    -v $PWD/config/ikev2-vpn-data:/etc/ipsec.d \
    -v /lib/modules:/lib/modules:ro \
    -p 500:500/udp \
    -p 4500:4500/udp \
    --privileged \
    hwdsl2/ipsec-vpn-server
```

### 目录结构

```txt
ikev2
├── config
│   ├── ikev2-vpn-data
│   │   ├── .vpnconfig
│   │   ├── cert9.db
│   │   ├── ikev2.conf
│   │   ├── ikev2setup.log
│   │   ├── key4.db
│   │   ├── passwd
│   │   ├── pkcs11.txt
│   │   ├── roc.mobileconfig
│   │   ├── roc.p12
│   │   └── roc.sswan
│   └── vpn.env
├── daemonset.yaml
└── kustomization.yaml
```

### 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/ikev2.yaml" />

* 这里不用 HostNetwork，是因为 VPN 软件对网络命名空间的操作较多，为避免影响宿主机网络，还是用容器网络进行隔离，通过 HostPort 暴露端口。

### 准备 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

namespace: default

secretGenerator:
  - name: ikev2-secret
    envs:
      - config/vpn.env
  - name: ikev2-vpn-data
    files:
      - config/ikev2-vpn-data/.vpnconfig
      - config/ikev2-vpn-data/cert9.db
      - config/ikev2-vpn-data/ikev2.conf
      - config/ikev2-vpn-data/ikev2setup.log
      - config/ikev2-vpn-data/key4.db
      - config/ikev2-vpn-data/passwd
      - config/ikev2-vpn-data/pkcs11.txt
      - config/ikev2-vpn-data/roc.mobileconfig
      - config/ikev2-vpn-data/roc.p12
      - config/ikev2-vpn-data/roc.sswan
```

## 配置 IKEv2 客户端

参考 [IKEv2 VPN 配置和使用指南](https://github.com/hwdsl2/setup-ipsec-vpn/blob/master/docs/ikev2-howto-zh.md)。
