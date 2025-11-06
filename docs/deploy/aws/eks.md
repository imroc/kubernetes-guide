# 创建 EKS 集群

## 添加 EKS 集群

在 AWS 控制台搜 eks 进入 EKS 控制台：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312141131.png)

`添加集群` - `创建`:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312141248.png)

按照步骤配置集群：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312141416.png)

等待集群创建完成，此时集群是空的，无法调度 pod，也无法通过 kubectl 进行操作。

## 配置 kubectl

配置 kubectl 前先确保 aws 命令行工具已安装，并参考官方文档进行配置：https://docs.aws.amazon.com/zh_cn/cli/latest/userguide/cli-chap-configure.html

我这里图省事，用最简单的方式配置，拿到 Access Key 和 Secret Key 后，执行 `aws configure` 配置即可：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312142604.png)

然后执行类似下面的命令，会自动将 eks 集群的 kubeconfig 合并到 `~/.kube/config`:

```bash
aws eks update-kubeconfig --region us-east-1 --name test-cluster
```

> 参考官方文档：https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html

执行一下 kubectl 试试:

```bash
$ kubectl get pod -A
NAMESPACE     NAME                       READY   STATUS    RESTARTS   AGE
kube-system   coredns-54d6f577c6-4qqm7   0/1     Pending   0          42m
kube-system   coredns-54d6f577c6-tsh7n   0/1     Pending   0          42m

$ kubectl get node
No resources found
```

可以发现自带的 coredns 没有节点可以调度，接下来需要为集群添加计算资源。

## 添加计算资源

在集群信息页切到`计算`选项卡:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312150934.png)

点`添加节点组`来添加 EC2 实例作为计算资源，可以设置数量和自动伸缩的最大最小数量。

尽量不要选`使用启动模版`，因为需要自行创建 EC2 的启动模版，你得知道所选系统、机型和规格等配置能否兼容 EKS，配错了会导致节点组创建失败，或者节点组创建成功，但最后 EC2 机器加入集群失败。

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F03%2F12%2F20240312153042.png)
