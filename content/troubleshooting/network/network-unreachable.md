# 排查网络不通

## 排查思路

TODO

## 可能原因

### 端口监听挂掉

如果容器内的端口已经没有进程监听了，内核就会返回 Reset 包，客户端就会报错连接被拒绝，可以进容器 netns 检查下端口是否存活:

``` bash
netstat -tunlp
```

### iptables 规则问题

检查报文是否有命中丢弃报文的 iptables 规则:

```bash
iptables -t filter -nvL
iptables -t nat -nvL
iptables -t raw -nvL
iptables -t mangle -nvL
iptables-save
```
