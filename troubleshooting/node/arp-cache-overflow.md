# ARP 表爆满

## 判断 arp_cache 是否溢出

内核日志会有有下面的报错:

``` txt
arp_cache: neighbor table overflow!
```

查看当前 arp 记录数:

``` bash
$ arp -an | wc -l
1335
```

查看 arp gc 阀值:

``` bash
$ sysctl -a | grep gc_thresh
net.ipv4.neigh.default.gc_thresh1 = 128
net.ipv4.neigh.default.gc_thresh2 = 512
net.ipv4.neigh.default.gc_thresh3 = 1024
net.ipv6.neigh.default.gc_thresh1 = 128
net.ipv6.neigh.default.gc_thresh2 = 512
net.ipv6.neigh.default.gc_thresh3 = 1024
```

当前 arp 记录数接近 `gc_thresh3` 比较容易 overflow，因为当 arp 记录达到 `gc_thresh3` 时会强制触发 gc 清理，当这时又有数据包要发送，并且根据目的 IP 在 arp cache 中没找到 mac 地址，这时会判断当前 arp cache 记录数加 1 是否大于 `gc_thresh3`，如果没有大于就会 时就会报错: `arp_cache: neighbor table overflow!`

## 解决方案

调整节点内核参数，将 arp cache 的 gc 阀值调高 (`/etc/sysctl.conf`):

``` bash
net.ipv4.neigh.default.gc_thresh1 = 80000
net.ipv4.neigh.default.gc_thresh2 = 90000
net.ipv4.neigh.default.gc_thresh3 = 100000
```

分析是否只是部分业务的 Pod 的使用场景需要节点有比较大的 arp 缓存空间。

如果不是，就需要调整所有节点内核参数。

如果是，可以将部分 Node 打上标签，比如:

  ``` bash
  kubectl label node host1 arp_cache=large
  ```

然后用 nodeSelector 或 nodeAffnity 让这部分需要内核有大 arp_cache 容量的 Pod 只调度到这部分节点，推荐使用 nodeAffnity，yaml 示例:

``` yaml
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: arp_cache
                operator: In
                values:
                - large
```