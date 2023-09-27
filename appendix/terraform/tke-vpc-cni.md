# TKE 集群（VPC-CNI）

```hcl title="main.tf"
terraform {
  required_providers {
    # highlight-next-line
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.81.24"
    }
  }
}

variable "secret_id" {
  default = "************************************" # 替换 secret id
}

variable "secret_key" {
  default = "********************************" # 替换 secret key
}

variable "region" {
  default = "ap-shanghai"
}

provider "tencentcloud" {
  secret_id  = var.secret_id  # 云 API 密钥 SecretId
  secret_key = var.secret_key # 云 API 密钥 SecretKey
  region     = var.region     # 地域，完整可用地域列表参考: https://cloud.tencent.com/document/product/213/6091
}

variable "availability_zone_first" {
  default = "ap-shanghai-4" # 替换首选可用区
}

variable "availability_zone_second" {
  default = "ap-shanghai-2" # 替换备选可用区
}

variable "default_instance_type" {
  default = "S5.MEDIUM4"
}

variable "vpc_name" {
  default = "roc-test" # 替换 VPC 名称
}

variable "cluster_name" {
  default = "roc-test-cluster" # 替换集群名称
}

variable "image_id" {
  default = "img-1tmhysjj" # TencentOS Server 3.2 with Driver
}

variable "security_group" {
  default = "sg-616bnwjw" # 替换安全组 ID
}

variable "skey_id" {
  default = "skey-3t01mlvf" # 替换 ssh 密钥 ID
}

variable "service_cidr" {
  default = "192.168.6.0/24" # 替换 service 网段
}

data "tencentcloud_vpc_instances" "vpc" {
  name = var.vpc_name
}

data "tencentcloud_vpc_subnets" "zone_first" {
  vpc_id            = data.tencentcloud_vpc_instances.vpc.instance_list.0.vpc_id
  availability_zone = var.availability_zone_first
}

data "tencentcloud_vpc_subnets" "zone_second" {
  vpc_id            = data.tencentcloud_vpc_instances.vpc.instance_list.0.vpc_id
  availability_zone = var.availability_zone_second
}

resource "tencentcloud_kubernetes_cluster" "managed_cluster" {
  vpc_id = data.tencentcloud_vpc_instances.vpc.instance_list.0.vpc_id
  cluster_max_pod_num             = 256
  cluster_name                    = var.cluster_name
  cluster_desc                    = "roc test cluster" # 替换集群描述
  cluster_version                 = "1.26.1"
  cluster_max_service_num         = 256
  cluster_internet                = true
  cluster_internet_security_group = var.security_group
  cluster_deploy_type             = "MANAGED_CLUSTER"

  container_runtime = "containerd"
  kube_proxy_mode = "ipvs"
  network_type    = "VPC-CNI" # 集群网络模式，GR 或 VPC-CNI，推荐用 VPC-CNI。如果用 GR，还需要设置集群网段(cluster_cidr)
  service_cidr    = var.service_cidr
  eni_subnet_ids = [
    data.tencentcloud_vpc_subnets.zone_first.instance_list.0.subnet_id,
    data.tencentcloud_vpc_subnets.zone_second.instance_list.0.subnet_id
  ]
  worker_config { # 集群创建时自动创建的 cvm worker 节点（非节点池），如果不需要，可以删除此代码块。
    instance_name     = "roc-test" # 替换节点cvm名称
    count             = 1 # 替换初始节点数量
    availability_zone = var.availability_zone_first
    instance_type     = var.default_instance_type

    system_disk_type           = "CLOUD_PREMIUM"
    system_disk_size           = 50
    internet_charge_type       = "TRAFFIC_POSTPAID_BY_HOUR"
    internet_max_bandwidth_out = 0 # 节点是否需要公网带宽，0 为不需要，1 为需要。
    public_ip_assigned         = false
    security_group_ids         = [var.security_group]
    subnet_id                  = data.tencentcloud_vpc_subnets.zone_first.instance_list.0.subnet_id

    enhanced_security_service = false
    enhanced_monitor_service  = false
    key_ids                   = [var.skey_id]
    img_id                    = var.image_id
  }
}

# 集群初始化时自动创建的节点池，如果不需要，可删除此代码块
resource "tencentcloud_kubernetes_node_pool" "mynodepool" {
  name                     = "roc-test-pool" # 替换节点池名称
  cluster_id               = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size                 = 6 # 最大节点数量
  min_size                 = 0 # 最小节点数量
  vpc_id                   = data.tencentcloud_vpc_instances.vpc.instance_list.0.vpc_id
  subnet_ids               = [data.tencentcloud_vpc_subnets.zone_first.instance_list.0.subnet_id]
  retry_policy             = "INCREMENTAL_INTERVALS"
  desired_capacity         = 2 # 节点池的期望节点数量
  enable_auto_scale        = false
  multi_zone_subnet_policy = "EQUALITY"
  node_os                  = "tlinux3.1x86_64"
  delete_keep_instance     = false

  auto_scaling_config {
    instance_type      = var.default_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    orderly_security_group_ids = [var.security_group]

    instance_charge_type = "SPOTPAID"
    spot_instance_type   = "one-time"
    spot_max_price       = "1000"
    public_ip_assigned   = false

    key_ids                   = [var.skey_id]
    enhanced_security_service = false
    enhanced_monitor_service  = false
  }
}
```

