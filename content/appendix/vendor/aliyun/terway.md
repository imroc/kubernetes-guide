# ACK 的 Terway 网络插件

## Terway 插件的三种模式

Terway 插件支持三种模式：
1. 默认模式（不勾选 `DataPath V2` 和 `NetworkPolicy 支持`）
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F24%2F20250924095942.png)
2. 勾选 `DataPath V2`。
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F26%2F20250926152354.png)
3. 勾选 `NetworkPolicy` （依赖勾选 `DataPath V2`）
![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F26%2F20250926160025.png)


## 组件部署 YAML

<Tabs>
  <TabItem value="1" label="默认">

  <Tabs>
    <TabItem value="1-1" label="terway-eniip">
      <FileBlock file="vendor/aliyun/terway-eniip-daemonset.yaml" showLineNumbers />
    </TabItem>
    <TabItem value="1-2" label="eni-config">
      <FileBlock file="vendor/aliyun/eni-config-configmap.yaml" showLineNumbers />
    </TabItem>
  </Tabs>

  </TabItem>
  <TabItem value="2" label="启用 DataPath V2">

  <Tabs>
    <TabItem value="1" label="terway-eniip">
      <FileBlock file="vendor/aliyun/terway-eniip-datapathv2-daemonset.yaml" showLineNumbers />
    </TabItem>
    <TabItem value="2" label="eni-config">
      <FileBlock file="vendor/aliyun/eni-config-datapathv2-configmap.yaml" showLineNumbers />
    </TabItem>
  </Tabs>

  </TabItem>
  <TabItem value="3" label="启用 NetworkPolicy 支持">

  <Tabs>
    <TabItem value="1" label="terway-eniip">

  与只勾选 `DataPath V2` 时的 YAML 一致。

    </TabItem>

    <TabItem value="2" label="eni-config">

  相比只勾选 `DataPath V2`，`disable_network_policy` 为 `false`：

  <FileBlock file="vendor/aliyun/eni-config-networkpolicy-configmap.yaml" showLineNumbers />

    </TabItem>
  </Tabs>

  </TabItem>
</Tabs>

## CNI 配置

<Tabs>
  <TabItem value="1" label="默认">
    <FileBlock file="vendor/aliyun/10-terway.conflist" showLineNumbers title="/etc/cni/net.d/10-terway.conflist" language="json" />
  </TabItem>
  <TabItem value="2" label="勾选 DataPath V2 或 NetworkPolicy">
    <FileBlock file="vendor/aliyun/10-terway-datapathv2.conflist" showLineNumbers title="/etc/cni/net.d/10-terway.conflist" language="json" />
  </TabItem>
</Tabs>

## CNI 二进制
```bash
$ ls /opt/cni/bin
bandwidth  bridge  cilium-cni  dhcp  dummy  firewall  host-device  host-local  ipvlan  LICENSE  loopback  macvlan  portmap  ptp  README.md  sbr  static  tap  terway  tuning  vlan  vrf
```

## 启动参数

<Tabs>
  <TabItem value="1" label="默认">

  ```bash
  $ kubectl exec -i -t terway-eniip-kncv6 -c terway -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 07:33 ?        00:00:00 /usr/bin/terwayd -log-level info -daemon-mode ENIMultiIP -config /etc/eni/eni_conf
  $ kubectl exec -i -t terway-eniip-kncv6 -c policy -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 08:45 ?        00:00:00 terway-cli policy
  ```

  </TabItem>

  <TabItem value="2" label="启用 DataPath V2">

  ```bash
  $ kubectl exec -i -t terway-eniip-kncv6 -c terway -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 07:33 ?        00:00:00 /usr/bin/terwayd -log-level info -daemon-mode ENIMultiIP -config /etc/eni/eni_conf
  $ kubectl exec -i -t terway-eniip-kncv6 -c policy -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 07:33 ?        00:00:15 cilium-agent --routing-mode=native --cni-chaining-mode=terway-chainer --enable-ipv4-masquerade=false --enable-ipv6-masquerade=false --disable-envoy-version-check=true --local-router-ipv4=169.254.10.1 --local-router-ipv6=fe80:2400:3200:baba::1 --enable-local-node-route=false --enable-endpoint-health-checking=false --enable-health-checking=false --enable-service-topology=true --k8s-heartbeat-timeout=0 --enable-session-affinity=true --install-iptables-rules=false --enable-l7-proxy=false --ipam=delegated-plugin --enable-bandwidth-manager=true --agent-health-port=9099 --enable-policy=never --labels=k8s:io\.kubernetes\.pod\.namespace --datapath-mode=veth --kube-proxy-replacement=true --bpf-lb-sock=true --bpf-lb-sock-hostns-only=true --enable-node-port=true --enable-host-port=true --enable-external-ips=true --enable-endpoint-routes=true --enable-l2-neigh-discovery=false --enable-in-cluster-loadbalance=true --terway-host-stack-cidr=169.254.20.10/32
  ```

  > 相比默认，policy 容器换成了 cilium-agent 进程启动。

  </TabItem>
  <TabItem value="3" label="启用 NetworkPolicy">

  ```bash
  $ kubectl exec -i -t terway-eniip-kncv6 -c terway -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 07:33 ?        00:00:00 /usr/bin/terwayd -log-level info -daemon-mode ENIMultiIP -config /etc/eni/eni_conf
  $ kubectl exec -i -t terway-eniip-kncv6 -c policy -- ps -ef
  UID          PID    PPID  C STIME TTY          TIME CMD
  root           1       0  0 07:42 ?        00:00:08 cilium-agent --routing-mode=native --cni-chaining-mode=terway-chainer --enable-ipv4-masquerade=false --enable-ipv6-masquerade=false --disable-envoy-version-check=true --local-router-ipv4=169.254.10.1 --local-router-ipv6=fe80:2400:3200:baba::1 --enable-local-node-route=false --enable-endpoint-health-checking=false --enable-health-checking=false --enable-service-topology=true --k8s-heartbeat-timeout=0 --enable-session-affinity=true --install-iptables-rules=false --enable-l7-proxy=false --ipam=delegated-plugin --enable-bandwidth-manager=true --agent-health-port=9099 --enable-policy=default --datapath-mode=veth --kube-proxy-replacement=true --bpf-lb-sock=true --bpf-lb-sock-hostns-only=true --enable-node-port=true --enable-host-port=true --enable-external-ips=true --enable-endpoint-routes=true --enable-l2-neigh-discovery=false --enable-in-cluster-loadbalance=true --terway-host-stack-cidr=169.254.20.10/32
  ```

  > 相比只启用 `DataPath V2`，policy 容器的 cilium-agent 的启动参数 `--enable-policy=never` 被修改为 `--enable-policy=default`。

  </TabItem>
</Tabs>


## 网络实现分析

### 默认

#### 网卡

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:2c:42:10 brd ff:ff:ff:ff:ff:ff
    altname enp0s6
    altname ens6
    inet 10.0.5.102/24 brd 10.0.5.255 scope global dynamic noprefixroute eth0
       valid_lft 1892159507sec preferred_lft 1892159507sec
    inet6 fe80::216:3eff:fe2c:4210/64 scope link
       valid_lft forever preferred_lft forever
3: kube-ipvs0: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN group default
    link/ether 2e:da:ca:cc:de:22 brd ff:ff:ff:ff:ff:ff
    inet 192.168.60.84/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.0.1/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.188.57/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.0.10/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.155.221/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
4: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:2c:7b:7a brd ff:ff:ff:ff:ff:ff
    altname enp0s8
    altname ens8
    inet 10.0.5.102/32 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::216:3eff:fe2c:7b7a/64 scope link
       valid_lft forever preferred_lft forever
5: caliaec797095c6@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 92:1a:36:d3:57:ed brd ff:ff:ff:ff:ff:ff link-netns cni-174631ed-0647-1e1b-5eef-6efabd9dd8b0
    inet6 fe80::901a:36ff:fed3:57ed/64 scope link
       valid_lft forever preferred_lft forever
```

#### 路由

```bash
$ ip rule list
0:      from all lookup local
512:    from all to 10.0.5.103 lookup main
2048:   from 10.0.5.103 lookup 1004
32766:  from all lookup main
32767:  from all lookup default
$ ip route show table 1004
default via 10.0.5.253 dev eth1 onlink
$ ip route show table main
default via 10.0.5.253 dev eth0 proto dhcp src 10.0.5.102 metric 100
10.0.5.0/24 dev eth0 proto kernel scope link src 10.0.5.102 metric 100
10.0.5.103 dev caliaec797095c6 scope link
```

#### 容器内

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether ca:b1:c0:0b:15:52 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.0.4.72/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::c8b1:c0ff:fe0b:1552/64 scope link
       valid_lft forever preferred_lft forever
$ ip route
default via 169.254.1.1 dev eth0 onlink
```

### DataPath V2
#### 网卡

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:1c:40:85 brd ff:ff:ff:ff:ff:ff
    altname enp0s6
    altname ens6
    inet 10.0.0.238/24 brd 10.0.0.255 scope global dynamic noprefixroute eth0
       valid_lft 1892159457sec preferred_lft 1892159457sec
    inet6 fe80::216:3eff:fe1c:4085/64 scope link
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:1c:7d:35 brd ff:ff:ff:ff:ff:ff
    altname enp0s8
    altname ens8
    inet 10.0.0.238/32 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::216:3eff:fe1c:7d35/64 scope link
       valid_lft forever preferred_lft forever
4: cilium_net@cilium_host: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether f6:d7:33:dd:e0:59 brd ff:ff:ff:ff:ff:ff
    inet6 fe80::f4d7:33ff:fedd:e059/64 scope link
       valid_lft forever preferred_lft forever
5: cilium_host@cilium_net: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 12:ff:43:ea:2d:1f brd ff:ff:ff:ff:ff:ff
    inet 169.254.10.1/32 scope global cilium_host
       valid_lft forever preferred_lft forever
    inet6 fe80:2400:3200:baba::1/128 scope link
       valid_lft forever preferred_lft forever
    inet6 fe80::10ff:43ff:feea:2d1f/64 scope link
       valid_lft forever preferred_lft forever
6: calid7425eb8b46@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether aa:25:d0:ea:1d:d7 brd ff:ff:ff:ff:ff:ff link-netns cni-214e294f-d376-6c3e-a76b-100bca475796
    inet6 fe80::a825:d0ff:feea:1dd7/64 scope link
       valid_lft forever preferred_lft forever
7: cali8b8630acb2b@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 3e:3a:38:81:12:93 brd ff:ff:ff:ff:ff:ff link-netns cni-42638ac7-385b-76b9-71fd-0524a49ea8b6
    inet6 fe80::3c3a:38ff:fe81:1293/64 scope link
       valid_lft forever preferred_lft forever
8: cali6dc30143901@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 8a:aa:e3:71:3d:b8 brd ff:ff:ff:ff:ff:ff link-netns cni-da7d277e-2f5d-19fd-7ca2-69b0451abde2
    inet6 fe80::88aa:e3ff:fe71:3db8/64 scope link
       valid_lft forever preferred_lft forever
10: cali8797a3843fa@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether e2:48:51:1e:bd:1e brd ff:ff:ff:ff:ff:ff link-netns cni-f4a5b1f7-3a77-cc86-e31b-ed6b465bde7e
    inet6 fe80::e048:51ff:fe1e:bd1e/64 scope link
       valid_lft forever preferred_lft forever
11: calic699fed89dc@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 36:fa:e2:69:b6:e5 brd ff:ff:ff:ff:ff:ff link-netns cni-c10f3468-bbe9-3ec4-64d5-7f096b9ce496
    inet6 fe80::34fa:e2ff:fe69:b6e5/64 scope link
       valid_lft forever preferred_lft forever
12: cali5869d48a1d1@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 46:8b:55:a8:b7:b1 brd ff:ff:ff:ff:ff:ff link-netns cni-3f125d63-d8db-73e5-df5a-bf329c860d0a
    inet6 fe80::448b:55ff:fea8:b7b1/64 scope link
       valid_lft forever preferred_lft forever
13: cali1a0b76096c7@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether c6:f9:99:bd:0f:c2 brd ff:ff:ff:ff:ff:ff link-netns cni-b8e9de81-33f7-bdb1-657f-46612a0b9841
    inet6 fe80::c4f9:99ff:febd:fc2/64 scope link
       valid_lft forever preferred_lft forever
14: calicb82c9f0082@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether f2:6f:f5:cf:26:02 brd ff:ff:ff:ff:ff:ff link-netns cni-9b439f79-5535-3622-118a-8d6325c8156b
    inet6 fe80::f06f:f5ff:fecf:2602/64 scope link
       valid_lft forever preferred_lft forever
```

#### 路由

```bash
$ ip rule list
0:      from all lookup local
512:    from all to 10.0.0.239 lookup main
512:    from all to 10.0.0.240 lookup main
512:    from all to 10.0.0.241 lookup main
512:    from all to 10.0.0.242 lookup main
512:    from all to 10.0.0.247 lookup main
512:    from all to 10.0.0.245 lookup main
512:    from all to 10.0.0.244 lookup main
512:    from all to 10.0.0.246 lookup main
2048:   from 10.0.0.239 lookup 1003
2048:   from 10.0.0.240 lookup 1003
2048:   from 10.0.0.241 lookup 1003
2048:   from 10.0.0.242 lookup 1003
2048:   from 10.0.0.247 lookup 1003
2048:   from 10.0.0.245 lookup 1003
2048:   from 10.0.0.244 lookup 1003
2048:   from 10.0.0.246 lookup 1003
32766:  from all lookup main
32767:  from all lookup default
$ ip route show table 1003
default via 10.0.0.253 dev eth1 onlink
$ ip route show table main
default via 10.0.0.253 dev eth0 proto dhcp src 10.0.0.238 metric 100
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.238 metric 100
10.0.0.239 dev calid7425eb8b46 proto kernel scope link
10.0.0.240 dev cali8b8630acb2b proto kernel scope link
10.0.0.241 dev cali6dc30143901 proto kernel scope link
10.0.0.242 dev cali8797a3843fa proto kernel scope link
10.0.0.244 dev cali1a0b76096c7 proto kernel scope link
10.0.0.245 dev cali5869d48a1d1 proto kernel scope link
10.0.0.246 dev calicb82c9f0082 proto kernel scope link
10.0.0.247 dev calic699fed89dc proto kernel scope link
```

#### 容器内

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether aa:52:e5:ce:7b:df brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.0.4.63/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::a852:e5ff:fece:7bdf/64 scope link
       valid_lft forever preferred_lft forever
$ ip route show
default via 169.254.1.1 dev eth0 onlink
```
