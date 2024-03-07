# IKEv2

## 为什么需要 IKEv2

如果需要手机或电脑在外面连上家里的内网，可以在家里路由器搭建 VPN 服务端，苹果的系统(iOS/MacOS)内置了 IKEv2 协议的 VPN 客户端，一些安卓设备也内置了，我们在路由器里部署下支持 IKEv2 协议的 VPN 服务端并暴露出来就可以实现远程连上家里内网了。

## 开源项目 

本文部署的 IKEv2 VPN 服务使用这个开源项目：https://github.com/hwdsl2/docker-ipsec-vpn-server

## 生成配置

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

最终 config 目录结构如下：

```txt
config
├── ikev2-vpn-data
│   ├── .vpnconfig
│   ├── cert9.db
│   ├── ikev2.conf
│   ├── ikev2setup.log
│   ├── key4.db
│   ├── passwd
│   ├── pkcs11.txt
│   ├── roc.mobileconfig
│   ├── roc.p12
│   └── roc.sswan
└── vpn.env
```

## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/ikev2.yaml" />

## 准备 kustomization.yaml

```yaml
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
