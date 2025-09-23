# GKE 的 CNI 插件

## CNI 配置

GKE 标准集群的 CNI 配置不是由 DaemonSet 管理的，应该是节点初始化时就已经配置好了。

配置如下：

<FileBlock file="vendor/gcloud/10-containerd-net.conflist" showLineNumbers title="/etc/cni/net.d/10-containerd-net.conflist" language="json" />
