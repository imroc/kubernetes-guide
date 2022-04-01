# 使用 Terraform 批量创建腾讯云服务器

## 准备配置文件

创建 `main.tf`, 根据自己需求按照注释提示替换内容:

```tf
terraform {
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.66.3"
    }
  }
}

provider "tencentcloud" {
  secret_id  = "************************************" # 云 API 密钥 SecretId
  secret_key = "********************************" # 云 API 密钥 SecretKey
  region     = "ap-chengdu" # 地域，完整可用地域列表参考: https://cloud.tencent.com/document/product/213/6091
}

data "tencentcloud_image" "ubuntu" {
  image_name_regex = "Ubuntu Server 20.04 LTS 64bit" # 操作系统镜像名

  filter {
    name   = "image-type"
    values = ["PUBLIC_IMAGE"]
  }
}

data "tencentcloud_instance_types" "node" {
  exclude_sold_out = true # 忽略已售罄的机型
  filter {
    name   = "instance-charge-type"
    values = ["POSTPAID_BY_HOUR"] # 过滤出支持按理计费的机型
  }
  filter {
    name   = "zone"
    values = ["ap-chengdu-1", "ap-chengdu-2"] # 过滤出可用区中可用的机型
  }
  cpu_core_count = 2 # 过滤 CPU 规格
  memory_size    = 4 # 过滤内存规格
}

data "tencentcloud_vpc_instances" "testvpc" {
  name = "testvpc" # 指定 VPC 名称
}

data "tencentcloud_vpc_subnets" "testsubnet" {
  vpc_id = data.tencentcloud_vpc_instances.testvpc.instance_list.0.vpc_id
  name   = "testsubnet-2-1" # 指定子网名称
}

resource "tencentcloud_instance" "testcvm" {
  count                      = 3 # 创建机器的数量
  instance_name              = "testcvm" # CVM 实例名称
  hostname                   = "testcvm" # CVM hostname
  system_disk_type           = "CLOUD_PREMIUM" # 系统盘类型：高性能云盘
  system_disk_size           = 50 # 系统盘大小：50GB
  project_id                 = 0 # 默认项目
  key_name                   = "skey-3t01mlvf" # SSH 密钥 ID
  instance_charge_type       = "POSTPAID_BY_HOUR" # 实例计费模式：按量计费
  allocate_public_ip         = true # 是否分配公网 IP
  internet_max_bandwidth_out = 100 # 公网流量带宽限制：100GB
  internet_charge_type       = "TRAFFIC_POSTPAID_BY_HOUR" # 公网流量计费模式：按使用流量
  availability_zone          = data.tencentcloud_vpc_subnets.testsubnet.instance_list.0.availability_zone # CVM 可用区跟随子网可用区
  image_id                   = data.tencentcloud_image.ubuntu.image_id
  instance_type              = data.tencentcloud_instance_types.node.instance_types.0.instance_type
  vpc_id                     = data.tencentcloud_vpc_instances.testvpc.instance_list.0.vpc_id
  subnet_id                  = data.tencentcloud_vpc_subnets.testsubnet.instance_list.0.subnet_id


  data_disks {
    data_disk_type = "CLOUD_PREMIUM" # 50GB 高性能云硬盘
    data_disk_size = 50
    encrypt        = false
  }

  tags = {
    test = "test" # 打上腾讯云标签
  }
}
```

## 创建并获取机器列表

在 `main.tf` 所在目录执行 `terraform apply`，输入 `yes` 确认执行。

执行完毕之后 CVM 创建成功，可以获取出创建出来的 CVM 内网 IP 列表 (注意替换 `testcvm`):

```bash
$ terraform show -json | jq '.values.root_module.resources[] | select(.address | test("tencentcloud_instance.testcvm")) | .values.private_ip'
"10.10.6.15"
"10.10.6.6"
"10.10.6.3"
```