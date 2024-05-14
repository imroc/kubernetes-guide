# DDNS

## 为什么需要 DDNS 服务

如果希望从外面通过 ssh 远程登录家里的路由器，或者通过 VPN 连上家里的内网，就需要知道家里的公网 IP 地址，而公网 IP 地址每次拨号都会变(比如断点或重启路由器就会重新拨号)，所以需要一个 DDNS 服务来自动修改 DNS 解析，指向当前家里的公网 IP 地址。

## 告知运营商开通固定 IP

目前我知道的只有电信的宽带支持独占 IP（固定 IP）， 即拨号后分配的公网 IP 只有你一家在用，不是多家共享。只有开通了这个固定 IP 功能，你才能从外面通过公网地址连上家里，需要打电话给运营商（电信是 10000），通过人工服务，让客户给开通，理由就说家里有许多智能家居设备（比如摄像头），有从外网连上家里网络的需求。

## DDNS 开源项目

本文部署的 DDNS 服务使用这个开源项目所构建出的容器镜像：https://github.com/NewFuture/DDNS

## 目录结构

```txt
ddns
├── config
│   └── config.json
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 DDNS 服务：config.json

```json showLineNumbers title="config/config.json"
{
    "$schema": "https://ddns.newfuture.cc/schema/v2.8.json",
    "debug": false,
    "dns": "dnspod",
    "id": "******",
    "token": "********************************",
    "index4": "shell:ip -4 addr show ppp0 scope global | awk '/inet/{print $2}' | awk -F '/' '{print $1}'",
    "ipv4": [
        "home.imroc.cc"
    ],
    "proxy": null,
    "ttl": null
}
```

* 我的域名在 DNSPod 管理，所以配置的是 DNSPod 的 id 和 token。
* `index4` 是指定获取本机公网 IPv4 的方法，我用的主路由方案，所以获取公网 IP 的方法直接读 `ppp0` 网卡上的公网 IP 地址就行，不需要调外部接口获取。
* 如果主路由也有 IPv6，可以加上 IPv6 的获取方法: `"index6": "shell:ip -6 addr show ppp0 | grep 'scope global dynamic'  | awk '/inet6/{print $2}' | awk -F '/' '{print $1}'",`

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/ddns.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

configMapGenerator:
  - files:
      - config/config.json
    name: ddns-config

namespace: default
```
