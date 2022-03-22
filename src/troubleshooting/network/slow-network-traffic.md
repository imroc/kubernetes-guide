# 排查网速差

网络差是指已经建立的连接，通信慢或期间有断连，本文介绍网络速度差的可能原因。

## 公网线路丢包

如果通信经过了公网传输，而公网线路难免有波动，任意一方网络环境差导致丢包都会让网速降下来。

这时 server 端可以调下拥塞算法，4.19 以上的内核自带了 bbr，在公网丢包情况下，能明显提升网络性能，可以启用观察下:

```bash
sysctl -w net.core.default_qdisc = fq
sysctl -w net.ipv4.tcp_available_congestion_control = bbr
```

## 达到带宽或 PPS 上限而被限速

如果是走公网，一般都有个公网带宽上限，可以看看监控是否达到带宽上限而被限速。

如果是走内网，也是可能会被限速的；通常云厂商的服务器有各种机型和规格，性能指标各不一样，可以先看下对应机型和规格的 PPS 和内网带宽能力，比如腾讯云可以看 [CVM实例规格](https://cloud.tencent.com/document/product/213/11518)，然后再看下监控，是否达到上限。

## NAT 环境没开启 nf_conntrack_tcp_be_liberal

容器环境下，不开启这个参数可能造成 NAT 过的 TCP 连接带宽上不去或经常断连。

现象是有一点时延的 TCP 单流速度慢或经常断连，比如:
1. 跨地域专线挂载 nfs ，时延 5ms，下载速度就上不去，只能到 12Mbps 左右。
2. 经过公网上传文件经常失败。

原因是如果流量存在一定时延时，有些包就可能 out of window 了，netfilter 会将 out of window 的包置为 INVALID，如果是 INVALID 状态的包，netfilter 不会对其做 IP 和端口的 NAT 转换，这样协议栈再去根据 ip + 端口去找这个包的连接时，就会找不到，这个时候就会回复一个 RST，但这个 RST 是直接宿主机发出，容器内不知道，导致容器内还以为连接没断不停重试。 所以如果数据包对应的 TCP 连接做过 NAT，在 conntrack 记录了地址转换信息，也有可能部分包因 out of window 不走 conntrack 转换地址，造成一些混乱导致流量速度慢或卡住的现象。
