# 修改 rp_filter 导致网络异常

## 背景

如果在 TKE 使用了 VPC-CNI 网络模式，会关闭节点的 rp_filter:

```bash
net.ipv4.conf.all.rp_filter=0
net.ipv4.conf.eth0.rp_filter=0
```

如果因为某种原因，将 rp_filter 打开了（参数置为1），会导致各种异常现象，排查下来就是网络不通，不通的原因就是 rp_filter 被打开了。

## 什么情况下可能被打开？

通常有两种原因 给节点加了自定义初始化的脚本，修改了默认的内核参数，将 rp_filter 打开了。
2. 使用了[自定义镜像](https://cloud.tencent.com/document/product/457/39563) ，在自定义镜像中自定义了内核参数，打开了 rp_filter。

## 为什么打开 rp_filter 会不通?

rp_filter 是控制内核是否开启校验数据包源地址的开关，如果被打开，当数据包发送和接收时的走的路径不太一样时，就会丢弃报文，主要是为了防止 DDoS 或 IP 欺骗。而 TKE VPC-CNI 网络的实现机制，当 Pod 与 VPC 网段之外的 IP 直接通信时，数据包发送走的单独的弹性网卡，接收会走主网卡(eth0)，如果开启了 rp_filter，这时就会导致网络不通。

总结几种常见的场景:
1. Pod 访问公网 (公网目的 IP 在 VPC 网段之外)
2. 使用了公网 [启用 CLB 直通 Pod](../networking/clb-to-pod-directly.md) (公网源 IP 在 VPC 网段之外)
3. Pod 访问 apiserver (169 的 IP 在 VPC 网段之外)
