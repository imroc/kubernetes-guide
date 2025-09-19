# AWS EKS VPC-CNI 容器网络插件

## 什么是 EKS VPC-CNI 插件？

是 AWS 容器服务（EKS）的一个容器网络插件，作为创建 EKS 集群时的一个可选插件，也可在创建集群后，直接在 EKS 集群控制台页面安装该扩展插件，主要功能是将弹性网卡（ENI）插入 Pod，让 Pod 可直接使用 AWS 上的弹性网卡进行通信，同时这个插件也是开源的。

- 开源地址：https://github.com/aws/amazon-vpc-cni-k8s
- 官方介绍文档：https://docs.aws.amazon.com/zh_cn/eks/latest/best-practices/vpc-cni.html
- 官方操作文档：https://docs.aws.amazon.com/zh_cn/eks/latest/userguide/managing-vpc-cni.html

## YAML

安装 VPC-CNI 后，会下发一个 DaemonSet 和一个 ConfigMap：

<Tabs>
  <TabItem value="1" label="DaemonSet">
    <FileBlock file="vpc-cni/aws/aws-node-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="ConfigMap">
    <FileBlock file="vpc-cni/aws/amazon-vpc-cni-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>


