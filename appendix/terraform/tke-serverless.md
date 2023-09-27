# TKE Serverless 集群

```hcl title="main.tf"
terraform {
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.80.4"
    }
  }
}

provider "tencentcloud" {
  secret_id  = "************************************" # 云 API 密钥 SecretId
  secret_key = "********************************" # 云 API 密钥 SecretKey
  region     = "ap-shanghai" # 地域，完整可用地域列表参考: https://cloud.tencent.com/document/product/213/6091
}


data "tencentcloud_vpc_instances" "myvpc" {
  name = "myvpc" # 指定 VPC 名称
}

data "tencentcloud_vpc_subnets" "mysubnet" {
  vpc_id = data.tencentcloud_vpc_instances.myvpc.instance_list.0.vpc_id
  name   = "mysubnet" # 指定子网名称
}

resource "tencentcloud_eks_cluster" "myserverless" {
  cluster_name = "roc-test-serverless" # 指定 serverless 集群名称
  k8s_version  = "1.24.4" # 指定 serverless 集群版本

  public_lb {
    enabled          = true # 打开公网访问 (kubectl 远程操作集群)
    allow_from_cidrs = ["0.0.0.0/0"]
  }

  vpc_id     = data.tencentcloud_vpc_instances.roctest.instance_list.0.vpc_id
  subnet_ids = [
    data.tencentcloud_vpc_subnets.mysubnet.instance_list.0.subnet_id
  ]
  cluster_desc        = "roc test cluster" # 集群描述
  service_subnet_id   = data.tencentcloud_vpc_subnets.mysubnet.instance_list.0.subnet_id
  enable_vpc_core_dns = true
  need_delete_cbs     = true
}
```

