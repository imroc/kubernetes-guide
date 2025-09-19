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


<FileBlock file="vpc-cni/aws/cilium-config-configmap.yaml" showLineNumbers />
