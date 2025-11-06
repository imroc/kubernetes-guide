# DHCP 与 DNS 服务: dnsmasq

## dnsmasq 介绍

`DHCP` 与 `DNS` 服务需在主路由上开启，如果用的主路由方案，可用云原生的方式部署一个 DHCP 和 DNS 服务，[dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html) 是一个同时支持这两种功能的开源软件，我们可以用下面的方法进行部署。

## docker-dnsmasq 开源项目

本文部署的 dnsmasq 服务使用这个开源项目所自动编译出的容器镜像：https://github.com/imroc/docker-dnsmasq

## 目录结构

```txt
dnsmasq
├── config
│   └── dnsmasq.conf
├── daemonset.yaml
└── kustomization.yaml
```

## 配置 dnsmasq.conf

<FileBlock showLineNumbers title="config/dnsmasq.conf" file="home-network/dnsmasq.conf" />

要点解析：
* `server` 指向上游的 DNS 地址，主路由在 PPPoE 拨号后会自动获取上游 dns 地址并写到 `/etc/resolv.conf`，可以复制过来。
* `dhcp-range` 指定内网设备自动获取的 IP  地址范围以及子网掩码。
* `dhcp-option=option:router` 指定内网设备的默认网关，即当前主路由的内网静态 IP 地址。
* `dhcp-option=option:dns-server` 指定内网设备自动获取的 DNS 地址，通常写 dnsmasq 自身的地址，即主路由的内网静态 IP 地址，不过由于我用了透明代理，希望内网设备直接用 PPPoE 拨号获得的运营商的 DNS 地址（好处是如果透明代理故障，停掉流量拦截规则后，内网设备也能正常从运营商 DNS 解析域名）。

## 配置 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/dnsmasq.yaml" />

## 配置 kustomization.yaml

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - daemonset.yaml

configMapGenerator:
  - name: dnsmasq-config
    files:
      - config/dnsmasq.conf

namespace: default
```
