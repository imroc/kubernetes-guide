# DHCP 与 DNS 服务: Dnsmasq

DHCP 与 DNS 服务需在主路由上开启，如果用的主路由方案，可用云原生的方式部署一个 DHCP 和 DNS 服务，dnsmasq 是一个同时支持这两种功能的开源软件，我们可以用下面的方法部署。

## 目录结构

```txt
dnsmasq
├── config
│   └── dnsmasq.conf
├── daemonset.yaml
└── kustomization.yaml
```

## 准备 dnsmasq 配置

<FileBlock showLineNumbers title="config/dnsmasq.conf" file="home-network/dnsmasq.conf" />

* `server` 指向上游的 DNS 地址，主路由在 PPPoE 拨号后会自动获取上游 dns 地址并写到 `/etc/resolv.conf`，可以复制过来。
* `dhcp-range` 指定内网设备自动获取的 IP  地址范围以及子网掩码。
* `dhcp-option=option:router` 指定内网设备的默认网关，即当前主路由的内网静态 IP 地址。
* `dhcp-option=option:dns-server` 指定内网设备自动获取的 DNS 地址，通常写 dnsmasq 自身的地址，即主路由的内网静态 IP 地址，不过由于我用了透明代理，希望内网设备直接用 PPPoE 拨号获得的运营商的 DNS 地址。


## 准备 daemonset.yaml

<FileBlock showLineNumbers title="daemonset.yaml" file="home-network/dnsmasq.yaml" />

* 注意修改账号密码，本例使用 `roc` 作为账号名，`111111` 作为密码。
* 将要共享的目录通过 hostPath 挂载进去，本例挂载和共享 `//data` 目录。

## 准备 kustomization.yaml

```yaml
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
