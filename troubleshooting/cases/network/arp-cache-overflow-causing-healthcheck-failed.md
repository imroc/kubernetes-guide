# ARP 爆满导致健康检查失败

## 案例

一用户某集群节点数 1200+，用户监控方案是 daemonset 部署 node-exporter 暴露节点监控指标，使用 hostNework 方式，statefulset 部署 promethues 且仅有一个实例，落在了一个节点上，promethues 请求所有节点 node-exporter 获取节点监控指标，也就是或扫描所有节点，导致 arp cache 需要存所有 node 的记录，而节点数 1200+，大于了 `net.ipv4.neigh.default.gc_thresh3` 的默认值 1024，这个值是个硬限制，arp cache记录数大于这个就会强制触发 gc，所以会造成频繁gc，当有数据包发送会查本地 arp，如果本地没找到 arp 记录就会判断当前 arp cache 记录数+1是否大于 gc_thresh3，如果没有就会广播 arp 查询 mac 地址，如果大于了就直接报 `arp_cache: neighbor table overflow!`，并且放弃 arp 请求，无法获取 mac 地址也就无法知道探测报文该往哪儿发(即便就在本机某个 veth pair)，kubelet 对本机 pod 做存活检查发 arp 查 mac 地址，在 arp cahce 找不到，由于这时 arp cache已经满了，刚要 gc 但还没做所以就只有报错丢包，导致存活检查失败重启 pod。

## 解决方案

调整部分节点内核参数，将 arp cache 的 gc 阀值调高 (`/etc/sysctl.conf`):

``` bash
net.ipv4.neigh.default.gc_thresh1 = 80000
net.ipv4.neigh.default.gc_thresh2 = 90000
net.ipv4.neigh.default.gc_thresh3 = 100000
```

并给 node 打下 label，修改 pod spec，加下 nodeSelector 或者 nodeAffnity，让 pod 只调度到这部分改过内核参数的节点，更多请参考本书 [节点排障: ARP 表爆满](../../node/arp-cache-overflow.md)
