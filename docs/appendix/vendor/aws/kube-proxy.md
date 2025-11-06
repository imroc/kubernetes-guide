# EKS 的 kube-proxy

## 概述

EKS 的 Auto Mode 和 Fargate 都看不到 kube-proxy，但实际背后应该有 kube-proxy 在运行，因为可以正常访问 Service，对于用户来说是黑盒。

只有在安装了 kube-proxy 插件，并创建了节点组时，由节点组创建出来的节点才会部署 kube-proxy DaemonSet，通过 `nodeAffinity` 来排除掉 Fargate 和 Auto Mode 节点:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.amazonaws.com/compute-type
          operator: NotIn
          values:
          - fargate
          - auto
```
## 如何设置转发模式

安装 kube-proxy 插件，默认是 iptables 转发模式，可通过插件配置来自定义，比如设置为 ipvs 转发模式：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F25%2F20250925101735.png)

## 组件部署 YAML

<Tabs>
  <TabItem value="1" label="kube-proxy">
    <FileBlock file="vendor/aws/kube-proxy-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="kube-proxy-config">
    <FileBlock file="vendor/aws/kube-proxy-config-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>
