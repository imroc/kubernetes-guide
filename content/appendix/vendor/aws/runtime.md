# EKS 节点的基础组件

## 概述

基于 EKS v1.33 分析 EKS 节点组上的节点基础组件。

## kubelet

### 启动参数

```bash
root        1969       1  1 02:27 ?        00:00:11 /usr/bin/kubelet --config-dir=/etc/kubernetes/kubelet/config.json.d --kubeconfig=/var/lib/kubelet/kubeconfig --image-credential-provider-bin-dir=/etc/eks/image-credential-provider --image-credential-provider-config=/etc/eks/image-credential-provider/config.json --node-ip=172.31.12.75 --cloud-provider=external --hostname-override=ip-172-31-12-75.us-east-2.compute.internal --config=/etc/kubernetes/kubelet/config.json --node-labels=eks.amazonaws.com/nodegroup-image=ami-0d39276e3c888c5e5,eks.amazonaws.com/capacityType=ON_DEMAND,eks.amazonaws.com/nodegroup=test
```
### 配置

<Tabs>
  <TabItem value="1" label="kubelet">
    <FileBlock file="vendor/aws/kubelet.service" showLineNumbers title="/etc/systemd/system/kubelet.service" language="systemd" />
  </TabItem>
  <TabItem value="2" label="environment">
    <FileBlock file="vendor/aws/kubelet.env" showLineNumbers title="/etc/eks/kubelet/environment" language="bash" />
  </TabItem>
</Tabs>


## containerd

### 版本

```bash
$ containerd --version
containerd github.com/containerd/containerd 1.7.27 05044ec0a9a75232cad458027ca83437aae3f4da
```

### 配置

<Tabs>
  <TabItem value="1" label="systemd">
    <FileBlock file="vendor/aws/containerd.service" title="/usr/lib/systemd/system/containerd.service" language="systemd" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="containerd">
    <FileBlock file="vendor/aws/containerd-config.toml" title="/etc/containerd/config.toml" showLineNumbers />
  </TabItem>
</Tabs>

