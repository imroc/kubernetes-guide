# 使用 Terraform 创建腾讯云 EKS 弹性集群

## 准备配置文件

创建 `main.tf`, 根据自己需求按照注释提示替换内容:

```tf
terraform {
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.70.1"
    }
  }
}

provider "tencentcloud" {
  secret_id  = "************************************" # 云 API 密钥 SecretId
  secret_key = "********************************" # 云 API 密钥 SecretKey
  region     = "ap-chengdu" # 地域，完整可用地域列表参考: https://cloud.tencent.com/document/product/213/6091
}

data "tencentcloud_vpc_instances" "test-vpc" {
  name = "test-vpc" # 指定 VPC 名称
}

data "tencentcloud_vpc_subnets" "eks-2-2" {
  vpc_id = data.tencentcloud_vpc_instances.test-vpc.instance_list.0.vpc_id
  name   = "eks-2-2" # 指定子网名称。多个子网就写多个类似的 "data" 块。
}

resource "tencentcloud_eks_cluster" "roc-test" {
  cluster_name = "roc-test"
  k8s_version  = "1.20.6"
  public_lb {
    enabled          = true
    allow_from_cidrs = ["0.0.0.0/0"]
  }
  vpc_id       = data.tencentcloud_vpc_instances.test-vpc.instance_list.0.vpc_id
  subnet_ids   = [
    data.tencentcloud_vpc_subnets.eks-2-2.instance_list.0.subnet_id # 引用声明的子网，多个就用逗号隔开
  ]
  cluster_desc        = "roc test"
  service_subnet_id   = data.tencentcloud_vpc_subnets.eks-2-2.instance_list.0.subnet_id
  enable_vpc_core_dns = true
  need_delete_cbs     = true
}
```

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

使用 [kubecm](../../trick/kubectl/merge-kubeconfig-with-kubecm.md) 可以一键导入合并 kubeconfig:

```bash
kubecm add -f eks
```

使用 [kubectx](../../trick/kubectl/quick-switch-with-kubectx.md) 可以切换 context:

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