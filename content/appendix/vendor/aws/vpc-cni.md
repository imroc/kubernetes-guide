# AWS EKS VPC-CNI 容器网络插件

## 什么是 EKS VPC-CNI 插件？

是 AWS 容器服务（EKS）的一个容器网络插件，作为创建 EKS 集群时的一个可选插件，也可在创建集群后，直接在 EKS 集群控制台页面安装该扩展插件，主要功能是将弹性网卡（ENI）插入 Pod，让 Pod 可直接使用 AWS 上的弹性网卡进行通信，同时这个插件也是开源的。

- 开源地址：https://github.com/aws/amazon-vpc-cni-k8s
- 官方介绍文档：https://docs.aws.amazon.com/zh_cn/eks/latest/best-practices/vpc-cni.html
- 官方操作文档：https://docs.aws.amazon.com/zh_cn/eks/latest/userguide/managing-vpc-cni.html

## 组件部署 YAML

安装 VPC-CNI 后，会下发一个 DaemonSet 和一个 ConfigMap：

<Tabs>
  <TabItem value="1" label="DaemonSet">
    <FileBlock file="vendor/aws/aws-node-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="ConfigMap">
    <FileBlock file="vendor/aws/amazon-vpc-cni-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## CNI 配置

<FileBlock file="vendor/aws/10-aws.conflist.json" showLineNumbers title="/etc/cni/net.d/10-aws.conflist" language="json" />

## CNI 二进制

```bash
root@ip-192-168-3-27:/opt/cni/bin# ls
LICENSE  README.md  aws-cni  aws-cni-support.sh  bandwidth  bridge  cnitool  dhcp  dummy  egress-cni  firewall  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tap  tuning  vlan  vrf
```

其中 `aws-cni-support.sh`:

<FileBlock file="vendor/aws/aws-cni-support.sh" showLineNumbers title="/opt/cni/bin/aws-cni-support.sh" />

## 网络实现分析

### 网卡

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: ens5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc mq state UP group default qlen 1000
    link/ether 02:95:51:bc:20:4d brd ff:ff:ff:ff:ff:ff
    altname enp0s5
    inet 172.31.12.75/20 metric 1024 brd 172.31.15.255 scope global dynamic ens5
       valid_lft 3420sec preferred_lft 3420sec
    inet6 fe80::95:51ff:febc:204d/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
3: kube-ipvs0: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN group default
    link/ether b2:85:65:ba:fc:f3 brd ff:ff:ff:ff:ff:ff
    inet 10.100.0.1/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 10.100.169.71/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 10.100.248.249/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 10.100.226.33/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
4: eni1910d54300c@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc noqueue state UP group default
    link/ether 56:55:42:80:51:82 brd ff:ff:ff:ff:ff:ff link-netns cni-ccc9d5df-93e5-711e-a52f-94e9e9369c6f
    inet6 fe80::5455:42ff:fe80:5182/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
5: ens6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc mq state UP group default qlen 1000
    link/ether 02:ab:7a:c3:46:51 brd ff:ff:ff:ff:ff:ff
    altname enp0s6
    inet 172.31.12.155/20 brd 172.31.15.255 scope global ens6
       valid_lft forever preferred_lft forever
    inet6 fe80::ab:7aff:fec3:4651/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
6: enib9bdbd48082@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc noqueue state UP group default
    link/ether d6:fa:7d:16:6f:18 brd ff:ff:ff:ff:ff:ff link-netns cni-60211068-b4fe-6ed5-741b-ff9e0350cd6c
    inet6 fe80::d4fa:7dff:fe16:6f18/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
```

### 路由

```bash
$ ip rule list
0:      from all lookup local
512:    from all to 172.31.3.251 lookup main
1024:   from all fwmark 0x80/0x80 lookup main
32766:  from all lookup main
32767:  from all lookup default
$ ip route
default via 172.31.0.1 dev ens5 proto dhcp src 172.31.12.75 metric 1024
172.31.0.0/20 dev ens5 proto kernel scope link src 172.31.12.75 metric 1024
172.31.0.1 dev ens5 proto dhcp scope link src 172.31.12.75 metric 1024
172.31.0.2 dev ens5 proto dhcp scope link src 172.31.12.75 metric 1024
172.31.3.251 dev enib9bdbd48082 scope link
```
