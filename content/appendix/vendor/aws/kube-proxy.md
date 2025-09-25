# EKS 的 kube-proxy

## 概述

EKS 的 Auto Mode 和 Fargate 都看不到 kube-proxy，但实际背后应该有 kube-proxy 在运行，因为可以正常访问 Service，对于用户来说是黑盒。

只有在安装了 kube-proxy 插件，并创建了节点组时，由节点组创建出来的节点才会部署 kube-proxy DaemonSet，通过

## 如何设置转发模式

安装 kube-proxy 插件，默认是 iptables 转发模式，可通过插件配置来自定义，比如设置为 ipvs 转发模式：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F25%2F20250925101735.png)
