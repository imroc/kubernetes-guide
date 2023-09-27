# 使用 Terraform 创建集群

利用 Terrafrom 可以创建各种云上产品化的 Kubernetes 集群。

## 准备配置文件

创建 `main.tf`, 可参考[附录](../appendix/terraform) 中的示例，根据自己需求按照注释提示替换内容

## 创建集群

在 `main.tf` 所在目录执行 `terraform init`，然后再执行 `terraform apply`，输入 `yes` 确认执行。

等待大约1分多钟，会自动打印创建出来的集群 id:

```txt
tencentcloud_eks_cluster.roc-test: Still creating... [1m10s elapsed]
tencentcloud_eks_cluster.roc-test: Still creating... [1m20s elapsed]
tencentcloud_eks_cluster.roc-test: Creation complete after 1m21s [id=cls-4d2qxcs5]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

## 获取 kubeconfig

集群刚创建好的时候，APIServer 外网访问的 CLB 还没创建好，不知道外网 IP 地址，terraform 本地记录的状态里，kubeconfig 的 server 地址就为空。所以我们先 refresh 一下，将创建好的 server 地址同步到本地:

```bash
terraform refresh
```

然后导出 kubeconfig 文件:

```bash
terraform show -json | jq -r '.values.root_module.resources[] | select(.address | test("tencentcloud_eks_cluster.roc-test")) | .values.kube_config' > eks
```

> 注意替换 `roc-test` 为自己在 `main.tf` 文件中定义的名字。

使用 [kubecm](../trick/kubectl/merge-kubeconfig-with-kubecm.md) 可以一键导入合并 kubeconfig:

```bash
kubecm add -f eks
```

使用 [kubectx](../trick/kubectl/quick-switch-with-kubectx.md) 可以切换 context:

```bash
kubectl ctx eks
```

然后就可以使用 kubectl 操作集群了。

## 销毁集群

在 `main.tf` 所在目录执行:

```bash
terraform destroy
```

## 参考资料

* [Terrafrom TencentCloud Provider Documentation](https://registry.terraform.io/providers/tencentcloudstack/tencentcloud/latest/docs)

