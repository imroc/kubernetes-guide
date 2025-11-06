# SNAT

## 标准集群 SNAT 开关

GKE 标准集群有个 SNAT 开关:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F23%2F20250923160815.png)

打开后，集群内并不会下发 DaemonSet 去写 iptables 规则，但会新增
