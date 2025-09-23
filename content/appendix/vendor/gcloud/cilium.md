# Cilium 对 GKE 的支持

## 概述

GKE 并没有对 cilium 做产品化支持，而是 cilium 开源社区支持了 GKE 标准集群的容器网络，在 GKE 环境中安装 cilium 时，自动做一些配置调整来适配。

## 安装方法

确保 node 打上如下的污点：

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

## YAML 清单

cilium 安装后，相关 YAML 如下：

<Tabs>
  <TabItem value="1" label="cilium">
    <FileBlock file="vendor/gcloud/cilium.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cilium-config">
    <FileBlock file="vendor/gcloud/cilium-config.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="3" label="cilium-operator">
    <FileBlock file="vendor/gcloud/cilium-operator.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="4" label="cilium-envoy">
    <FileBlock file="vendor/gcloud/cilium-envoy.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="5" label="cilium-envoy-config">
    <FileBlock file="vendor/gcloud/cilium-envoy-config.yaml" showLineNumbers />
  </TabItem>
</Tabs>
