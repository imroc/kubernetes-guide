# GKE 的 CNI 插件

## CNI 配置

GKE 标准集群的 CNI 配置不是由 DaemonSet 管理的，应该是节点初始化时就已经配置好了。

配置如下：

<FileBlock file="vendor/gcloud/10-containerd-net.conflist" showLineNumbers title="/etc/cni/net.d/10-containerd-net.conflist" language="json" />

## CNI 二进制

```bash
$ ls /opt/cni/bin
bandwidth  bridge  dhcp  dummy  firewall  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tap  tuning  vlan  vrf
```

## 分析

每个节点分配一段 PodCIDR，然后节点内 CNI 配置使用 [ptp](https://www.cni.dev/plugins/current/main/ptp/) + `host-local` 来为每个 Pod 创建 veth 和分配 IP 并配置路由。

```bash
$ ip route
default via 10.142.0.1 dev eth0 proto dhcp src 10.142.0.9 metric 1024
10.44.1.2 dev veth071f0374 scope host
10.44.1.4 dev veth55b32f93 scope host
10.44.1.5 dev vethc999ae08 scope host
10.44.1.6 dev vethfa0aa10c scope host
10.44.1.7 dev vethc55f4943 scope host
10.44.1.8 dev vethc10aacfe scope host
10.44.1.9 dev veth5a9ec129 scope host
10.44.1.10 dev veth2570278f scope host
10.44.1.11 dev vethd714b34c scope host
10.44.1.12 dev vethb44cb382 scope host
10.142.0.1 dev eth0 proto dhcp scope link src 10.142.0.9 metric 1024
169.254.123.0/24 dev docker0 proto kernel scope link src 169.254.123.1 linkdown
169.254.169.254 via 10.142.0.1 dev eth0 proto dhcp src 10.142.0.9 metric 1024
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc mq state UP group default qlen 1000
    link/ether 42:01:0a:8e:00:09 brd ff:ff:ff:ff:ff:ff
    inet 10.142.0.9/32 metric 1024 scope global dynamic eth0
       valid_lft 3491sec preferred_lft 3491sec
    inet6 fe80::4001:aff:fe8e:9/64 scope link
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1460 qdisc noqueue state DOWN group default
    link/ether 02:42:3e:97:49:a4 brd ff:ff:ff:ff:ff:ff
    inet 169.254.123.1/24 brd 169.254.123.255 scope global docker0
       valid_lft forever preferred_lft forever
4: veth071f0374@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 06:4f:04:9d:1c:98 brd ff:ff:ff:ff:ff:ff link-netns cni-a2419ea2-ebf6-7cc2-8492-bba08891999a
    inet 10.44.1.1/32 scope global veth071f0374
       valid_lft forever preferred_lft forever
    inet6 fe80::44f:4ff:fe9d:1c98/64 scope link
       valid_lft forever preferred_lft forever
6: veth55b32f93@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 36:6c:24:66:32:2e brd ff:ff:ff:ff:ff:ff link-netns cni-f12b69d9-6731-232d-3399-eafccae5af85
    inet 10.44.1.1/32 scope global veth55b32f93
       valid_lft forever preferred_lft forever
    inet6 fe80::346c:24ff:fe66:322e/64 scope link
       valid_lft forever preferred_lft forever
7: vethc999ae08@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 16:eb:8f:2c:dd:6c brd ff:ff:ff:ff:ff:ff link-netns cni-c3179db9-6b8f-2f52-8c7e-aaad74d00fd4
    inet 10.44.1.1/32 scope global vethc999ae08
       valid_lft forever preferred_lft forever
    inet6 fe80::14eb:8fff:fe2c:dd6c/64 scope link
       valid_lft forever preferred_lft forever
8: vethfa0aa10c@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether de:62:7b:65:81:40 brd ff:ff:ff:ff:ff:ff link-netns cni-4b3bc0da-567f-2645-9218-7b194357ed71
    inet 10.44.1.1/32 scope global vethfa0aa10c
       valid_lft forever preferred_lft forever
    inet6 fe80::dc62:7bff:fe65:8140/64 scope link
       valid_lft forever preferred_lft forever
9: vethc55f4943@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether fa:ab:72:67:3a:c2 brd ff:ff:ff:ff:ff:ff link-netns cni-bb4218e9-b6d7-53ab-5a58-64cb3197898b
    inet 10.44.1.1/32 scope global vethc55f4943
       valid_lft forever preferred_lft forever
    inet6 fe80::f8ab:72ff:fe67:3ac2/64 scope link
       valid_lft forever preferred_lft forever
10: vethc10aacfe@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether ce:b8:1b:69:79:3a brd ff:ff:ff:ff:ff:ff link-netns cni-502b1fd4-426b-4f4c-0d64-689f38dd63d6
    inet 10.44.1.1/32 scope global vethc10aacfe
       valid_lft forever preferred_lft forever
    inet6 fe80::ccb8:1bff:fe69:793a/64 scope link
       valid_lft forever preferred_lft forever
11: veth5a9ec129@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 46:8a:66:f9:97:d3 brd ff:ff:ff:ff:ff:ff link-netns cni-809e0e4e-490f-656d-3d67-d254f5f6f855
    inet 10.44.1.1/32 scope global veth5a9ec129
       valid_lft forever preferred_lft forever
    inet6 fe80::448a:66ff:fef9:97d3/64 scope link
       valid_lft forever preferred_lft forever
12: veth2570278f@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether ee:fa:f3:99:59:0c brd ff:ff:ff:ff:ff:ff link-netns cni-1a0a438c-fd4c-d0df-fdb2-020fbafca6b7
    inet 10.44.1.1/32 scope global veth2570278f
       valid_lft forever preferred_lft forever
    inet6 fe80::ecfa:f3ff:fe99:590c/64 scope link
       valid_lft forever preferred_lft forever
13: vethd714b34c@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 26:fc:31:ad:ad:3a brd ff:ff:ff:ff:ff:ff link-netns cni-1e94954c-75b3-9a95-eed2-119e0ef6a136
    inet 10.44.1.1/32 scope global vethd714b34c
       valid_lft forever preferred_lft forever
    inet6 fe80::24fc:31ff:fead:ad3a/64 scope link
       valid_lft forever preferred_lft forever
14: vethb44cb382@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP group default qlen 1000
    link/ether 02:e0:96:59:c2:4d brd ff:ff:ff:ff:ff:ff link-netns cni-d43c0563-1458-8fc5-10f6-bd6791d5d2c3
    inet 10.44.1.1/32 scope global vethb44cb382
       valid_lft forever preferred_lft forever
    inet6 fe80::e0:96ff:fe59:c24d/64 scope link
       valid_lft forever preferred_lft forever
$ ip link show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 42:01:0a:8e:00:09 brd ff:ff:ff:ff:ff:ff
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1460 qdisc noqueue state DOWN mode DEFAULT group default
    link/ether 02:42:3e:97:49:a4 brd ff:ff:ff:ff:ff:ff
4: veth071f0374@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 06:4f:04:9d:1c:98 brd ff:ff:ff:ff:ff:ff link-netns cni-a2419ea2-ebf6-7cc2-8492-bba08891999a
6: veth55b32f93@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 36:6c:24:66:32:2e brd ff:ff:ff:ff:ff:ff link-netns cni-f12b69d9-6731-232d-3399-eafccae5af85
7: vethc999ae08@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 16:eb:8f:2c:dd:6c brd ff:ff:ff:ff:ff:ff link-netns cni-c3179db9-6b8f-2f52-8c7e-aaad74d00fd4
8: vethfa0aa10c@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether de:62:7b:65:81:40 brd ff:ff:ff:ff:ff:ff link-netns cni-4b3bc0da-567f-2645-9218-7b194357ed71
9: vethc55f4943@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether fa:ab:72:67:3a:c2 brd ff:ff:ff:ff:ff:ff link-netns cni-bb4218e9-b6d7-53ab-5a58-64cb3197898b
10: vethc10aacfe@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether ce:b8:1b:69:79:3a brd ff:ff:ff:ff:ff:ff link-netns cni-502b1fd4-426b-4f4c-0d64-689f38dd63d6
11: veth5a9ec129@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 46:8a:66:f9:97:d3 brd ff:ff:ff:ff:ff:ff link-netns cni-809e0e4e-490f-656d-3d67-d254f5f6f855
12: veth2570278f@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether ee:fa:f3:99:59:0c brd ff:ff:ff:ff:ff:ff link-netns cni-1a0a438c-fd4c-d0df-fdb2-020fbafca6b7
13: vethd714b34c@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 26:fc:31:ad:ad:3a brd ff:ff:ff:ff:ff:ff link-netns cni-1e94954c-75b3-9a95-eed2-119e0ef6a136
14: vethb44cb382@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1460 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 02:e0:96:59:c2:4d brd ff:ff:ff:ff:ff:ff link-netns cni-d43c0563-1458-8fc5-10f6-bd6791d5d2c3
```
