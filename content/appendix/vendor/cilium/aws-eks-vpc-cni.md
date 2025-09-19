# Cilium AWS VPC-CNI 插件的支持

## 概述

AWS 并没有对 cilium 做产品化支持，而是 cilium 开源社区支持了 AWS VPC-CNI 插件，在 EKS 环境中安装 cilium 时，自动做一些配置调整来适配 VPC-CNI。

## 安装方法

确保 node 打上如下的污点（可在节点组上配置）：

```yaml
  taints:
   - key: "node.cilium.io/agent-not-ready"
     value: "true"
     effect: "NoExecute"
```

然后用 cli 工具安装 cilium:

```bash
cilium install --version 1.18.2
```

## cilium-config

安装后 cilium-config 这个 ConfigMap 配置如下：

<Tabs>
  <TabItem value="1" label="cilium DaemonSet">
    <FileBlock file="vpc-cni/aws/cilium-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cilium-config ConfigMap">
    <FileBlock file="vpc-cni/aws/cilium-config-configmap.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="3" label="cilium-envoy DaemonSet">
    <FileBlock file="vpc-cni/aws/cilium-envoy-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="4" label="cilium-envoy-config ConfigMap">
    <FileBlock file="vpc-cni/aws/cilium-envoy-config-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>
