# 基础网络配置

## 配置静态 IP 和默认路由

软路由需要配置一个静态 IP 和一个默认路由，Ubuntu 可以使用 netplan 来配置，配置文件路径是 `/etc/netplan/config.yaml`，通过 `netplan apply` 执行生效。下面根据不同方案给出一些配置示例。

### 主路由方案配置

对于主路由方案，需要选一个网口用来连接光猫来拨号上网，再选一个网口配置内网静态 IP 并连接交换机，用于内网通信和路由转发，下面是我用过的配置：

<FileBlock showLineNumbers title="/etc/netplan/config.yaml" file="home-network/netplan-config-main-route.yaml" />

解释一下：
* 我的路由器有 6 个网口，Ubuntu 默认使用 `enp*s0` 的命名方式自动给网口分配网卡名称。
* 第一个网口我用来拨号上网，上联是光猫（光猫设置桥接，不要光猫的路由功能）。设置用第一个网口来做 PPPoE 拨号的话，会自动修改默认路由走虚拟出来的 `ppp0` 网卡，这里配置的默认路由不重要。
* 第二个网口设置一个内网静态 IP，用于内网通信。内网网段我计划用 `10.10.10.0/24`，软路由静态 IP 使用 `10.10.10.2`，如果要用 IPv6，也得分配个固定的内网 IPv6 地址，写到 `addresses` 里。
* 使用静态 IP，禁用掉 dhcp 动态获取 IP 的能力，所以每个网口的 `dhcp4` 和 `dhcp6` 均设为 false。

### 旁路由方案配置

对于旁路由方案，不需要拨号，主要选一个网口来配置内网静态 IP 就行，这个网口连上交换机，配置示例：

<FileBlock showLineNumbers title="/etc/netplan/config.yaml" file="home-network/netplan-config-bypass-route.yaml" />

### 桥接

如果需要，其它剩余网口设置桥接，当做交换机用，方面接入更多设备。可以在 netplan 配置里加下 `bridges` 配置:

```yaml
  bridges:
    br0:
      dhcp4: no
      interfaces: 
        - enp3s0
        - enp4s0
        - enp5s0
```

## 配置拨号上网

旁路由方案的拨号上网这里不做介绍，不同场景配置方法各不相同，比如主路由是华为、小米路由器设备，需登录路由器管理页面进行配置；如果是让光猫来拨号，需登录光猫进行配置；如果使用双软路由方案，比如在 EXSI 里虚拟出 RouterOS 作为主路由，那么就登陆 RouterOS 主路由页面进行配置拨号上网。

这里只给出主路由方案的 Ubuntu 系统配置 PPPoE 拨号的方法。

需要实现 Ubuntu 开机自动执行 PPPoE 拨号，可以用 `networkd-dispatcher` 来实现：

<FileBlock showLineNumbers title="/etc/networkd-dispatcher/carrier.d/setup-pppoe.sh" file="home-network/setup-pppoe.sh" />

如果不生效，可以在 `rc.local` 开机脚本里做（目前本人就是这么做的）：

```bash showLineNumbers title="/etc/rc.local"
#!/bin/bash

echo "run pppoe"
pon dsl-provider
```

> 确保 rc-local 服务处于 enabled 状态: `systemctl enable rc-local`

另外，路由器上网需要配置 IP MASQUERADE，即确保让出公网的报文的源 IP 自动 SNAT 成本机公网 IP，这样才能正常收到回包，我是通过 nftables 配置的，以下是 nftables 配置文件：

```txt
#!/sbin/nft -f

table inet ppp
delete table inet ppp

table inet ppp {
    chain postrouting {
        type nat hook postrouting priority 100; policy accept;
        oifname != "ppp0" return
        meta l4proto { tcp, udp } ip saddr 10.10.0.0/16 counter masquerade
        meta l4proto { tcp, udp } ip6 saddr fddd:dddd:dddd:dddd::/64 counter masquerade
    }
}
```

## 配置混杂模式

对于软路由，配置网卡为混杂模式很重要，因为作为路由器，需要监听所有流量，这样才能做路由转发。可以在 `/etc/network/if-up.d/` 目录下配置脚本，实现开机自动为所有网卡打开混杂模式：

```bash showLineNumbers title="/etc/network/if-up.d/set-promisc"
#!/bin/bash

for i in {1..6}
do
  /sbin/ip link set enp${i}s0 promisc on
done

/sbin/ip link set br_lan promisc on
```

## 配置防火墙

对于主路由方案，在 Ubuntu 里配置防火墙，可以用 nftables 来声明式配置：

<FileBlock showLineNumbers file="home-network/nftables-firewall.conf" />

> 确保 nftables 服务处于 enabled 状态: `systemctl enable nftables`

## 配置内核参数

<FileBlock showLineNumbers title="/etc/sysctl.d/10-router.conf" file="home-network/10-router.conf" />

> 删除自带的一些内核参数配置，避免冲突：`rm /etc/sysctl.d/10-network-security.conf`
