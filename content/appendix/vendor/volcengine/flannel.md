# VKE 的 flannel 网络插件

## 概述

本文调研 VKE 选择 Flannel 网络插件的部署和配置情况（基于 VKE v1.30）：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F22%2F20250922152859.png)

## YAML 清单

<Tabs>
  <TabItem value="1" label="kube-flannel-ds">
    <FileBlock file="vendor/volcengine/kube-flannel-ds.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="kube-flannel-cfg">
    <FileBlock file="vendor/volcengine/kube-flannel-cfg.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## CNI 配置

<FileBlock file="vendor/volcengine/10-flannel.conflist" showLineNumbers language="json" />

## CNI 二进制

```bash
root@iv-ye59gm2y9sxjd1ty5094:/opt/cni/bin# ls
bandwidth  bridge  dhcp  firewall  flannel  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tuning  vlan  vrf
```

## 进程

```bash
root@iv-ye59gm2y9sxjd1ty5094:/opt/cni/bin# ps -ef | grep flannel
root       30286   29628  0 15:28 ?        00:00:00 /opt/bin/flanneld --ip-masq --kube-subnet-mgr
```
