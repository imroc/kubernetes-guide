# 在 ACK 上安装 cilium

## 前提条件
- 网络插件：terway

## 安装 cilium

参考 [Installation using Helm](https://docs.cilium.io/en/stable/installation/k8s-install-helm/)。

1. 删除预装的 terway 和 crd:
```bash
kubectl -n kube-system delete daemonset terway-eniip
kubectl delete crd \
    ciliumclusterwidenetworkpolicies.cilium.io \
    ciliumendpoints.cilium.io \
    ciliumidentities.cilium.io \
    ciliumnetworkpolicies.cilium.io \
    ciliumnodes.cilium.io \
    bgpconfigurations.crd.projectcalico.org \
    clusterinformations.crd.projectcalico.org \
    felixconfigurations.crd.projectcalico.org \
    globalnetworkpolicies.crd.projectcalico.org \
    globalnetworksets.crd.projectcalico.org \
    hostendpoints.crd.projectcalico.org \
    ippools.crd.projectcalico.org \
    networkpolicies.crd.projectcalico.org
```

2. 创建 `cilium-secret.yaml` 文件，填入 aksk：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-alibabacloud
  namespace: kube-system
type: Opaque
stringData:
  ALIBABA_CLOUD_ACCESS_KEY_ID: ""
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: ""
```

3. 安装：

```bash
kubectl apply -f cilium-secret.yaml
helm install cilium cilium/cilium --version 1.18.2 \
  --namespace kube-system \
  --set alibabacloud.enabled=true \
  --set ipam.mode=alibabacloud \
  --set enableIPv4Masquerade=false \
  --set routingMode=native
```

4. 修改 DaemonSet。实测需修改 cilium daemonset，给这几个 container 加上特权才能正常启动(`apply-sysctl-overwrites`, `mount-cgroup`, `install-cni-binaries`)，否则会报权限问题的错误：
  ```bash
  $ kubectl logs -f cilium-hkphf -c mount-cgroup
  cp: cannot stat '/hostbin/cilium-mount': Permission denied

  $ kubectl logs -f cilium-hkphf -c apply-sysctl-overwrites
  Installing loopback to /host/opt/cni/bin/loopback ...
  cp: cannot stat '/host/opt/cni/bin/.loopback.new': Permission denied
  Installing cilium-cni to /host/opt/cni/bin/cilium-cni ...
  cp: cannot stat '/host/opt/cni/bin/.cilium-cni.new': Permission denied
  ```

5. 删除自带的 `cilium-operator-resource-lock` (terway 控制面自带 cilium operator)，否则 cilium-operator 无法成功选主并运行 cilium 控制面逻辑:
  ```bash
  kubectl delete leases.coordination.k8s.io cilium-operator-resource-lock
  ```
  > 若通过 `kubectl get leases.coordination.k8s.io cilium-operator-resource-lock` 看到当前选主的还是 `terway-controlplane` 开头的 id，需再次删除，直到不是该前缀的 id 被选主。

## 配置分析

### CNI 配置

cilium 安装后，CNI 配置为:

```json title="/etc/cni/net.d/10-cilium.conflist"
{
  "cniVersion": "0.3.1",
  "name": "cilium",
  "plugins": [
    {
       "type": "cilium-cni",
       "enable-debug": false,
       "log-file": "/var/run/cilium/cilium-cni.log"
    }
  ]
}
```
### CNI 二进制

CNI 二进制目录的情况：

```bash
$ ls /opt/cni/bin
bandwidth  bridge  cilium-cni  dhcp  dummy  firewall  host-device  host-local  ipvlan  LICENSE  loopback  macvlan  portmap  ptp  README.md  sbr  static  tap  terway  tuning  vlan  vrf
```

### cilium iptables 规则

```bash
$ iptables-save | grep -i cilium
:CILIUM_POST_nat - [0:0]
:CILIUM_OUTPUT_nat - [0:0]
:CILIUM_PRE_nat - [0:0]
-A PREROUTING -m comment --comment "cilium-feeder: CILIUM_PRE_nat" -j CILIUM_PRE_nat
-A POSTROUTING -m comment --comment "cilium-feeder: CILIUM_POST_nat" -j CILIUM_POST_nat
-A OUTPUT -m comment --comment "cilium-feeder: CILIUM_OUTPUT_nat" -j CILIUM_OUTPUT_nat
:CILIUM_POST_mangle - [0:0]
:CILIUM_PRE_mangle - [0:0]
-A PREROUTING -m comment --comment "cilium-feeder: CILIUM_PRE_mangle" -j CILIUM_PRE_mangle
-A POSTROUTING -m comment --comment "cilium-feeder: CILIUM_POST_mangle" -j CILIUM_POST_mangle
-A CILIUM_PRE_mangle ! -o lo -m socket --transparent -m comment --comment "cilium: any->pod redirect proxied traffic to host proxy" -j MARK --set-xmark 0x200/0xffffffff
-A CILIUM_PRE_mangle -i eth0 -m comment --comment "cilium: primary ENI" -m addrtype --dst-type LOCAL --limit-iface-in -j CONNMARK --set-xmark 0x80/0x80
-A CILIUM_PRE_mangle -i lxc+ -m comment --comment "cilium: primary ENI" -j CONNMARK --restore-mark --nfmask 0x80 --ctmask 0x80
-A CILIUM_PRE_mangle -p tcp -m comment --comment "cilium: TPROXY to host cilium-dns-egress proxy" -j TPROXY --on-port 42133 --on-ip 127.0.0.1 --tproxy-mark 0x200/0xffffffff
-A CILIUM_PRE_mangle -p udp -m comment --comment "cilium: TPROXY to host cilium-dns-egress proxy" -j TPROXY --on-port 42133 --on-ip 127.0.0.1 --tproxy-mark 0x200/0xffffffff
:CILIUM_INPUT - [0:0]
:CILIUM_OUTPUT - [0:0]
:CILIUM_FORWARD - [0:0]
-A INPUT -m comment --comment "cilium-feeder: CILIUM_INPUT" -j CILIUM_INPUT
-A FORWARD -m comment --comment "cilium-feeder: CILIUM_FORWARD" -j CILIUM_FORWARD
-A OUTPUT -m comment --comment "cilium-feeder: CILIUM_OUTPUT" -j CILIUM_OUTPUT
-A CILIUM_INPUT -m comment --comment "cilium: ACCEPT for proxy traffic" -j ACCEPT
-A CILIUM_OUTPUT -m comment --comment "cilium: ACCEPT for proxy traffic" -j ACCEPT
-A CILIUM_OUTPUT -m comment --comment "cilium: ACCEPT for l7 proxy upstream traffic" -j ACCEPT
-A CILIUM_OUTPUT -m comment --comment "cilium: host->any mark as from host" -j MARK --set-xmark 0xc00/0xf00
-A CILIUM_FORWARD -o cilium_host -m comment --comment "cilium: any->cluster on cilium_host forward accept" -j ACCEPT
-A CILIUM_FORWARD -i cilium_host -m comment --comment "cilium: cluster->any on cilium_host forward accept (nodeport)" -j ACCEPT
-A CILIUM_FORWARD -i lxc+ -m comment --comment "cilium: cluster->any on lxc+ forward accept" -j ACCEPT
-A CILIUM_FORWARD -i cilium_net -m comment --comment "cilium: cluster->any on cilium_net forward accept (nodeport)" -j ACCEPT
-A CILIUM_FORWARD -o lxc+ -m comment --comment "cilium: any->cluster on lxc+ forward accept" -j ACCEPT
-A CILIUM_FORWARD -i lxc+ -m comment --comment "cilium: cluster->any on lxc+ forward accept (nodeport)" -j ACCEPT
:CILIUM_OUTPUT_raw - [0:0]
:CILIUM_PRE_raw - [0:0]
-A PREROUTING -m comment --comment "cilium-feeder: CILIUM_PRE_raw" -j CILIUM_PRE_raw
-A OUTPUT -m comment --comment "cilium-feeder: CILIUM_OUTPUT_raw" -j CILIUM_OUTPUT_raw
-A CILIUM_OUTPUT_raw -o lxc+ -m comment --comment "cilium: NOTRACK for proxy return traffic" -j CT --notrack
-A CILIUM_OUTPUT_raw -o cilium_host -m comment --comment "cilium: NOTRACK for proxy return traffic" -j CT --notrack
-A CILIUM_OUTPUT_raw -o lxc+ -m comment --comment "cilium: NOTRACK for L7 proxy upstream traffic" -j CT --notrack
-A CILIUM_OUTPUT_raw -o cilium_host -m comment --comment "cilium: NOTRACK for L7 proxy upstream traffic" -j CT --notrack
-A CILIUM_PRE_raw -m comment --comment "cilium: NOTRACK for proxy traffic" -j CT --notrack
```

### 网卡情况

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:23:f5:96 brd ff:ff:ff:ff:ff:ff
    altname enp0s6
    altname ens6
    inet 10.0.0.238/24 brd 10.0.0.255 scope global dynamic noprefixroute eth0
       valid_lft 1892140155sec preferred_lft 1892140155sec
    inet6 fe80::216:3eff:fe23:f596/64 scope link
       valid_lft forever preferred_lft forever
3: kube-ipvs0: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN group default
    link/ether b2:d2:f3:ab:b0:54 brd ff:ff:ff:ff:ff:ff
    inet 192.168.192.245/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.0.10/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.3.55/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.0.1/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.18.230/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
    inet 192.168.149.209/32 scope global kube-ipvs0
       valid_lft forever preferred_lft forever
4: nodelocaldns: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN group default
    link/ether 8e:4d:a8:7c:3a:69 brd ff:ff:ff:ff:ff:ff
    inet 169.254.20.10/32 scope global nodelocaldns
       valid_lft forever preferred_lft forever
5: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:24:3c:a7 brd ff:ff:ff:ff:ff:ff
    altname enp0s8
    altname ens8
    inet6 fe80::216:3eff:fe24:3ca7/64 scope link
       valid_lft forever preferred_lft forever
6: cilium_net@cilium_host: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 5a:d9:bd:97:98:1a brd ff:ff:ff:ff:ff:ff
    inet6 fe80::58d9:bdff:fe97:981a/64 scope link
       valid_lft forever preferred_lft forever
7: cilium_host@cilium_net: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 72:20:fb:fe:25:06 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.240/32 scope global cilium_host
       valid_lft forever preferred_lft forever
    inet6 fe80::7020:fbff:fefe:2506/64 scope link
       valid_lft forever preferred_lft forever
8: eth2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:16:3e:33:41:3e brd ff:ff:ff:ff:ff:ff
    altname enp0s9
    altname ens9
    inet6 fe80::216:3eff:fe33:413e/64 scope link
       valid_lft forever preferred_lft forever
10: lxc_health@if9: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 92:33:9b:30:00:5f brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::9033:9bff:fe30:5f/64 scope link
       valid_lft forever preferred_lft forever
12: lxc716f4afaa7f3@if11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether aa:12:25:f8:b9:9b brd ff:ff:ff:ff:ff:ff link-netns cni-d4cf52f7-6ac6-9aa6-8085-ead4cab5bc0d
    inet6 fe80::a812:25ff:fef8:b99b/64 scope link
       valid_lft forever preferred_lft forever
14: lxc0c3594138df7@if13: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 86:d5:0c:45:19:bc brd ff:ff:ff:ff:ff:ff link-netns cni-da5889de-4279-7d08-0550-9b48ca8dd0f3
    inet6 fe80::84d5:cff:fe45:19bc/64 scope link
       valid_lft forever preferred_lft forever
16: lxcfd7467c5825a@if15: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 46:a3:e7:c9:97:6b brd ff:ff:ff:ff:ff:ff link-netns cni-fface1a1-9fd4-103a-4197-51ea52885100
    inet6 fe80::44a3:e7ff:fec9:976b/64 scope link
       valid_lft forever preferred_lft forever
18: lxc5c50409673da@if17: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 62:97:19:5c:cd:38 brd ff:ff:ff:ff:ff:ff link-netns cni-ae297c70-b16b-8867-3cee-9dc93bfa73e1
    inet6 fe80::6097:19ff:fe5c:cd38/64 scope link
       valid_lft forever preferred_lft forever
20: lxce3437fa17974@if19: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 8e:e3:34:ac:b0:6d brd ff:ff:ff:ff:ff:ff link-netns cni-956f2564-09cf-88b5-3a2e-b4b4e269f00f
    inet6 fe80::8ce3:34ff:feac:b06d/64 scope link
       valid_lft forever preferred_lft forever
22: lxc97a68878aebe@if21: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether e2:a7:a0:a7:a2:35 brd ff:ff:ff:ff:ff:ff link-netns cni-171b6837-e91e-2f07-f9c5-5d0064868caa
    inet6 fe80::e0a7:a0ff:fea7:a235/64 scope link
       valid_lft forever preferred_lft forever
```

### 路由情况

```bash
$ ip rule list
9:      from all fwmark 0x200/0xf00 lookup 2004
20:     from all to 10.0.0.246 lookup main
20:     from all to 10.0.0.243 lookup main
20:     from all to 10.0.0.2 lookup main
20:     from all to 10.0.0.250 lookup main
20:     from all to 10.0.0.245 lookup main
20:     from all to 10.0.0.244 lookup main
20:     from all to 10.0.0.239 lookup main
100:    from all lookup local
111:    from 10.0.0.240 lookup 11
111:    from 10.0.0.246 lookup 11
111:    from 10.0.0.243 lookup 11
111:    from 10.0.0.2 lookup 11
111:    from 10.0.0.250 lookup 11
111:    from 10.0.0.245 lookup 11
111:    from 10.0.0.244 lookup 11
111:    from 10.0.0.239 lookup 10
32766:  from all lookup main
32767:  from all lookup default
$ ip route show table 11
default via 10.0.0.253 dev eth2 proto kernel
10.0.0.253 dev eth2 proto kernel scope link
$ ip route show table 10
default via 10.0.0.253 dev eth1 proto kernel
10.0.0.253 dev eth1 proto kernel scope link
$ ip route show table main
default via 10.0.0.253 dev eth0 proto dhcp src 10.0.0.238 metric 100
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.238 metric 100
10.0.0.2 dev lxc0c3594138df7 proto kernel scope link
10.0.0.239 dev lxc97a68878aebe proto kernel scope link
10.0.0.243 dev lxc716f4afaa7f3 proto kernel scope link
10.0.0.244 dev lxce3437fa17974 proto kernel scope link
10.0.0.245 dev lxc5c50409673da proto kernel scope link
10.0.0.246 dev lxc_health proto kernel scope link
10.0.0.250 dev lxcfd7467c5825a proto kernel scope link
```

### nftables 全量规则

```bash
$ nft list ruleset
table ip nat {
        chain PREROUTING {
                type nat hook prerouting priority dstnat; policy accept;
                 counter packets 11 bytes 592 jump CILIUM_PRE_nat
                 counter packets 533 bytes 32459 jump KUBE-SERVICES
        }

        chain INPUT {
                type nat hook input priority 100; policy accept;
        }

        chain POSTROUTING {
                type nat hook postrouting priority srcnat; policy accept;
                 counter packets 1581 bytes 97717 jump CILIUM_POST_nat
                 counter packets 50925 bytes 3156149 jump KUBE-POSTROUTING
        }

        chain OUTPUT {
                type nat hook output priority -100; policy accept;
                 counter packets 1579 bytes 97597 jump CILIUM_OUTPUT_nat
                 counter packets 50610 bytes 3135432 jump KUBE-SERVICES
        }

        chain KUBE-KUBELET-CANARY {
        }

        chain KUBE-SERVICES {
                ip saddr 127.0.0.0/8 counter packets 996 bytes 59760 return
                ip saddr != 10.0.0.0/8  # match-set KUBE-CLUSTER-IP dst,dst counter packets 3 bytes 180 jump KUBE-MARK-MASQ
                fib daddr type local counter packets 3051 bytes 182638 jump KUBE-NODE-PORT
                # match-set KUBE-CLUSTER-IP dst,dst counter packets 3 bytes 180 accept
        }

        chain KUBE-POSTROUTING {
                 # match-set KUBE-LOOP-BACK dst,dst,src counter packets 0 bytes 0 masquerade
                meta mark & 0x00004000 != 0x00004000 counter packets 6480 bytes 399717 return
                counter packets 3 bytes 180 meta mark set mark xor 0x4000
                 counter packets 3 bytes 180 masquerade
        }

        chain KUBE-NODE-PORT {
        }

        chain KUBE-LOAD-BALANCER {
                counter packets 0 bytes 0 jump KUBE-MARK-MASQ
        }

        chain KUBE-MARK-MASQ {
                counter packets 3 bytes 180 meta mark set mark or 0x4000
        }

        chain CILIUM_POST_nat {
        }

        chain CILIUM_OUTPUT_nat {
        }

        chain CILIUM_PRE_nat {
        }
}
table ip6 nat {
        chain PREROUTING {
                type nat hook prerouting priority dstnat; policy accept;
                 counter packets 0 bytes 0 jump KUBE-SERVICES
        }

        chain INPUT {
                type nat hook input priority 100; policy accept;
        }

        chain POSTROUTING {
                type nat hook postrouting priority srcnat; policy accept;
                 counter packets 0 bytes 0 jump KUBE-POSTROUTING
        }

        chain OUTPUT {
                type nat hook output priority -100; policy accept;
                 counter packets 0 bytes 0 jump KUBE-SERVICES
        }

        chain KUBE-KUBELET-CANARY {
        }

        chain KUBE-SERVICES {
                ip6 saddr ::1 counter packets 0 bytes 0 return
                fib daddr type local counter packets 0 bytes 0 jump KUBE-NODE-PORT
        }

        chain KUBE-POSTROUTING {
                meta mark & 0x00004000 != 0x00004000 counter packets 0 bytes 0 return
                counter packets 0 bytes 0 meta mark set mark xor 0x4000
                 counter packets 0 bytes 0 masquerade  random-fully
        }

        chain KUBE-NODE-PORT {
        }

        chain KUBE-LOAD-BALANCER {
                counter packets 0 bytes 0 jump KUBE-MARK-MASQ
        }

        chain KUBE-MARK-MASQ {
                counter packets 0 bytes 0 meta mark set mark or 0x4000
        }
}
table ip mangle {
        chain PREROUTING {
                type filter hook prerouting priority mangle; policy accept;
                 counter packets 19802 bytes 4084324 jump CILIUM_PRE_mangle
        }

        chain INPUT {
                type filter hook input priority mangle; policy accept;
        }

        chain FORWARD {
                type filter hook forward priority mangle; policy accept;
        }

        chain OUTPUT {
                type route hook output priority mangle; policy accept;
        }

        chain POSTROUTING {
                type filter hook postrouting priority mangle; policy accept;
                 counter packets 20134 bytes 4691947 jump CILIUM_POST_mangle
        }

        chain KUBE-IPTABLES-HINT {
        }

        chain KUBE-KUBELET-CANARY {
        }

        chain CILIUM_POST_mangle {
        }

        chain CILIUM_PRE_mangle {
                oifname != "lo" # socket --transparent meta mark & 0x00000f00 != 0x00000e00 meta mark & 0x00000f00 != 0x00000800  counter packets 0 bytes 0 meta mark set 0x200
                iifname "eth0"  fib daddr . iif type local counter packets 4681 bytes 2064926 ct mark set ct mark or 0x80
                iifname "lxc*"  counter packets 3955 bytes 620214 meta mark set ct mark and 0x80
                meta l4proto tcp meta mark 0x95a40200  counter packets 0 bytes 0 # TPROXY redirect 127.0.0.1:42133 mark 0x200/0xffffffff
                meta l4proto udp meta mark 0x95a40200  counter packets 0 bytes 0 # TPROXY redirect 127.0.0.1:42133 mark 0x200/0xffffffff
        }
}
table ip filter {
        chain INPUT {
                type filter hook input priority filter; policy accept;
                 counter packets 17330 bytes 3234571 jump CILIUM_INPUT
                meta l4proto udp ip daddr 169.254.20.10 udp dport 53  counter packets 0 bytes 0 accept
                meta l4proto tcp ip daddr 169.254.20.10 tcp dport 53  counter packets 0 bytes 0 accept
                 counter packets 754640 bytes 1173700715 jump KUBE-IPVS-FILTER
                 counter packets 754640 bytes 1173700715 jump KUBE-PROXY-FIREWALL
                 counter packets 754640 bytes 1173700715 jump KUBE-NODE-PORT
                counter packets 848321 bytes 1595653457 jump KUBE-FIREWALL
        }

        chain FORWARD {
                type filter hook forward priority filter; policy accept;
                 counter packets 2472 bytes 849753 jump CILIUM_FORWARD
                 counter packets 0 bytes 0 jump KUBE-PROXY-FIREWALL
                 counter packets 0 bytes 0 jump KUBE-FORWARD
        }

        chain OUTPUT {
                type filter hook output priority filter; policy accept;
                 counter packets 17662 bytes 3842194 jump CILIUM_OUTPUT
                meta l4proto udp ip saddr 169.254.20.10 udp sport 53  counter packets 0 bytes 0 accept
                meta l4proto tcp ip saddr 169.254.20.10 tcp sport 53  counter packets 0 bytes 0 accept
                 counter packets 664464 bytes 125502818 jump KUBE-IPVS-OUT-FILTER
                counter packets 705796 bytes 127429564 jump KUBE-FIREWALL
        }

        chain KUBE-FIREWALL {
                ip saddr != 127.0.0.0/8 ip daddr 127.0.0.0/8  ct status dnat counter packets 0 bytes 0 drop
        }

        chain KUBE-KUBELET-CANARY {
        }

        chain KUBE-FORWARD {
                 meta mark & 0x00004000 == 0x00004000 counter packets 0 bytes 0 accept
                 ct state related,established counter packets 0 bytes 0 accept
        }

        chain KUBE-NODE-PORT {
                 # match-set KUBE-HEALTH-CHECK-NODE-PORT dst counter packets 0 bytes 0 accept
        }

        chain KUBE-PROXY-FIREWALL {
        }

        chain KUBE-SOURCE-RANGES-FIREWALL {
                counter packets 0 bytes 0 drop
        }

        chain KUBE-IPVS-FILTER {
                # match-set KUBE-LOAD-BALANCER dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-CLUSTER-IP dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-EXTERNAL-IP dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-EXTERNAL-IP-LOCAL dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-HEALTH-CHECK-NODE-PORT dst counter packets 0 bytes 0 return
                ct state new # match-set KUBE-IPVS-IPS dst counter packets 0 bytes 0 reject
        }

        chain KUBE-IPVS-OUT-FILTER {
        }

        chain CILIUM_INPUT {
                meta mark & 0x00000f00 == 0x00000200  counter packets 0 bytes 0 accept
        }

        chain CILIUM_OUTPUT {
                meta mark & 0x00000e00 == 0x00000a00  counter packets 0 bytes 0 accept
                meta mark & 0x00000e00 == 0x00000800  counter packets 0 bytes 0 accept
                meta mark & 0x00000f00 != 0x00000e00 meta mark & 0x00000f00 != 0x00000d00 meta mark & 0x00000f00 != 0x00000400 meta mark & 0x00000e00 != 0x00000a00 meta mark & 0x00000e00 != 0x00000800 meta mark & 0x00000f00 != 0x00000f00  counter packets 17662 bytes 3842194 meta mark set mark and 0xfffff0ff xor 0xc00
        }

        chain CILIUM_FORWARD {
                oifname "cilium_host"  counter packets 0 bytes 0 accept
                iifname "cilium_host"  counter packets 0 bytes 0 accept
                iifname "lxc*"  counter packets 1185 bytes 221524 accept
                iifname "cilium_net"  counter packets 0 bytes 0 accept
                oifname "lxc*"  counter packets 1287 bytes 628229 accept
                iifname "lxc*"  counter packets 0 bytes 0 accept
        }
}
table ip6 mangle {
        chain PREROUTING {
                type filter hook prerouting priority mangle; policy accept;
        }

        chain INPUT {
                type filter hook input priority mangle; policy accept;
        }

        chain FORWARD {
                type filter hook forward priority mangle; policy accept;
        }

        chain OUTPUT {
                type route hook output priority mangle; policy accept;
        }

        chain POSTROUTING {
                type filter hook postrouting priority mangle; policy accept;
        }

        chain KUBE-IPTABLES-HINT {
        }

        chain KUBE-KUBELET-CANARY {
        }
}
table ip6 filter {
        chain INPUT {
                type filter hook input priority filter; policy accept;
                 counter packets 0 bytes 0 jump KUBE-IPVS-FILTER
                 counter packets 0 bytes 0 jump KUBE-PROXY-FIREWALL
                 counter packets 0 bytes 0 jump KUBE-NODE-PORT
        }

        chain FORWARD {
                type filter hook forward priority filter; policy accept;
                 counter packets 0 bytes 0 jump KUBE-PROXY-FIREWALL
                 counter packets 0 bytes 0 jump KUBE-FORWARD
        }

        chain OUTPUT {
                type filter hook output priority filter; policy accept;
                 counter packets 209 bytes 12728 jump KUBE-IPVS-OUT-FILTER
        }

        chain KUBE-KUBELET-CANARY {
        }

        chain KUBE-FORWARD {
                 meta mark & 0x00004000 == 0x00004000 counter packets 0 bytes 0 accept
                 ct state related,established counter packets 0 bytes 0 accept
        }

        chain KUBE-NODE-PORT {
                 # match-set KUBE-6-HEALTH-CHECK-NODE-PORT dst counter packets 0 bytes 0 accept
        }

        chain KUBE-PROXY-FIREWALL {
        }

        chain KUBE-SOURCE-RANGES-FIREWALL {
                counter packets 0 bytes 0 drop
        }

        chain KUBE-IPVS-FILTER {
                # match-set KUBE-6-LOAD-BALANCER dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-6-CLUSTER-IP dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-6-EXTERNAL-IP dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-6-EXTERNAL-IP-LOCAL dst,dst counter packets 0 bytes 0 return
                # match-set KUBE-6-HEALTH-CHECK-NODE-PORT dst counter packets 0 bytes 0 return
                ct state new # match-set KUBE-6-IPVS-IPS dst counter packets 0 bytes 0 reject
        }

        chain KUBE-IPVS-OUT-FILTER {
        }
}
table ip raw {
        chain PREROUTING {
                type filter hook prerouting priority raw; policy accept;
                 counter packets 19802 bytes 4084324 jump CILIUM_PRE_raw
                meta l4proto udp ip daddr 169.254.20.10 udp dport 53  counter packets 0 bytes 0 notrack
                meta l4proto tcp ip daddr 169.254.20.10 tcp dport 53  counter packets 0 bytes 0 notrack
        }

        chain OUTPUT {
                type filter hook output priority raw; policy accept;
                 counter packets 20016 bytes 4131851 jump CILIUM_OUTPUT_raw
                meta l4proto tcp ip saddr 169.254.20.10 tcp sport 8080  counter packets 0 bytes 0 notrack
                meta l4proto tcp ip daddr 169.254.20.10 tcp dport 8080  counter packets 0 bytes 0 notrack
                meta l4proto udp ip daddr 169.254.20.10 udp dport 53  counter packets 0 bytes 0 notrack
                meta l4proto tcp ip daddr 169.254.20.10 tcp dport 53  counter packets 0 bytes 0 notrack
                meta l4proto udp ip saddr 169.254.20.10 udp sport 53  counter packets 0 bytes 0 notrack
                meta l4proto tcp ip saddr 169.254.20.10 tcp sport 53  counter packets 0 bytes 0 notrack
        }

        chain CILIUM_OUTPUT_raw {
                oifname "lxc*" meta mark & 0xfffffeff == 0x00000a00  counter packets 0 bytes 0 notrack
                oifname "cilium_host" meta mark & 0xfffffeff == 0x00000a00  counter packets 0 bytes 0 notrack
                oifname "lxc*" meta mark & 0x00000e00 == 0x00000800  counter packets 0 bytes 0 notrack
                oifname "cilium_host" meta mark & 0x00000e00 == 0x00000800  counter packets 0 bytes 0 notrack
        }

        chain CILIUM_PRE_raw {
                meta mark & 0x00000f00 == 0x00000200  counter packets 0 bytes 0 notrack
        }
}
```
