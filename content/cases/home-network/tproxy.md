# nftables 透明拦截流量

## 概述

iptables 和 nftables 都能用于透明代理的流量拦截，区别就是 nftables 是后起之秀，未来取代 iptables。可读性更高、性能更好。

本文介绍如何在路由器利用 nftables 透明拦截流量。

## 思路

可以利用 Pod 的 postStart 和 preStop 两个生命周期的 hook 来设置和清理 nftables 相关规则：

```yaml
        lifecycle:
          postStart:
            exec:
              command:
              - /scripts/set-rules.sh
          preStop:
            exec:
              command:
              - /scripts/clean.sh
```

:::tip[注意]

当前本人已将在 postStart 中设置规则改成了用单独的 sidecar 来设置规则，因为 postStart 中的输出无法通过 `kubectl logs` 查看，在排障时会比较麻烦。

:::

脚本和 nftables 通过 configmap 挂载：

<Tabs>
  <TabItem value="mount" label="volumeMounts">

    ```yaml
            volumeMounts:
            - mountPath: /scripts
              name: script
            - mountPath: /etc/nftables
              name: nftables-config
    ```

  </TabItem>
  <TabItem value="volume" label="volumes">

    ```yaml
          volumes:
          - configMap:
              defaultMode: 420
              name: nftables-config
            name: nftables-config
          - configMap:
              defaultMode: 511
              name: script
            name: script
    ```

  </TabItem>
</Tabs>

另外，保险起见，可以加个 `initContainer`，保证在启动的时候也执行下清理规则的脚本（避免代理 Pod 异常挂掉导致 preStop 里的清理规则脚本没执行到）：

```yaml
      initContainers:
      - command:
        - /scripts/clean.sh
        image: your-proxy-image
        imagePullPolicy: IfNotPresent
        name: clean
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /scripts
          name: script
```

## nftables 规则

<FileBlock file="home-network/nftables-tproxy.conf" title="nftables.conf" />

## 设置规则的脚本

<FileBlock file="home-network/set-rules.sh" showFileName />

## 清理规则的脚本

<FileBlock file="home-network/clean.sh" showFileName />

## 定向拦截

如果家里的设备特别多，全局拦截流量的话，对代理的压力可能较大，有时可能会影响网速。

这种情况可以考虑只拦截特定设备的流量，比如 DHCP 动态分配网段为 `10.10.10.15~10.10.10.254`，而 `10.10.10.1~10.10.10.14` 这个小网段用于静态 IP 分配，且 nftables 拦截规则只拦截这个小网段的设备（`10.10.10.0/28`），示例：

```conf showLineNumbers
# https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
log-queries=extra
no-resolv
no-poll
server=61.139.2.69
strict-order
log-dhcp
cache-size=2000
dhcp-range=set:green,10.10.10.15,10.10.10.254,255.255.255.0,12h
dhcp-authoritative
dhcp-leasefile=/var/lib/dnsmasq/dnsmasq.leases
dhcp-option=option:router,10.10.10.2
dhcp-option=option:dns-server,61.139.2.69,218.6.200.139
# highlight-start
dhcp-host=fc:19:3c:37:2a:1c,10.10.10.6,set:red # iPhone - me
dhcp-host=f8:f2:c2:95:7e:fa,10.10.10.7,set:red # iPhone - wife
dhcp-host=59:e6:ba:5e:6f:2e,10.10.10.8,set:red # iPad
dhcp-host=a0:78:17:87:9e:52,10.10.10.5,set:red # M1
dhcp-host=7c:f3:5d:ec:8a:3a,10.10.10.9,set:red # M3
dhcp-host=a4:c9:a9:d5:73:77,10.10.10.10,set:red # Mate70 Pro+
# highlight-end
```

`dhcp-host` 配置项里填入设备的 MAC 地址及其对应固定分配的 IP 地址。

:::tip[注意]

有些设备在内网通信时可能不会使用真实的 MAC 地址，比如 iPhone，可以在无线局域网里点进连上的 WiFi 设置下，关掉 `私有无线局域网地址`：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F04%2F27%2F20240427155116.png)

macOS 也是类似的：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F09%2F21%2F20240921160637.png)

:::

