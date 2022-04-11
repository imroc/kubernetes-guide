# 使用 kubespray 搭建集群

## 原理

[kubespray](https://github.com/kubernetes-sigs/kubespray) 是利用 [ansible](https://docs.ansible.com/ansible/latest/index.html) 这个工具，通过 SSH 协议批量让指定远程机器执行一系列脚本，安装各种组件，完成 K8S 集群搭建。

## 准备工作

下载 kubespray 并拷贝一份配置:

```bash
# 下载 kubespray
$ git clone --depth=1 https://github.com/kubernetes-sigs/kubespray.git
$ cd kubespray
# 安装依赖，包括 ansible
$ sudo pip3 install -r requirements.txt

# 复制一份配置文件
cp -rfp inventory/sample inventory/mycluster
```

## 修改配置

### 集群网络

修改配置文件 `inventory/mycluster/group_vars/k8s_cluster/k8s-cluster.yml`:

```yaml
# 选择网络插件，支持 cilium, calico, weave 和 flannel
kube_network_plugin: cilium

# 设置 Service 网段
kube_service_addresses: 10.233.0.0/18

# 设置 Pod 网段
kube_pods_subnet: 10.233.64.0/18
```

其它相关配置文件: `inventory/mycluster/group_vars/k8s_cluster/k8s-net-*.yml`。

### 运行时

修改配置文件 `inventory/mycluster/group_vars/k8s_cluster/k8s-cluster.yml`:

```yaml
# 支持 docker, crio 和 containerd，推荐 containerd.
container_manager: containerd

# 是否开启 kata containers
kata_containers_enabled: false
```

其它相关配置文件:

```txt
inventory/mycluster/group_vars/all/containerd.yml
inventory/mycluster/group_vars/all/cri-o.yml
inventory/mycluster/group_vars/all/docker.yml
```

### 集群证书

修改配置文件 `inventory/mycluster/group_vars/k8s_cluster/k8s-cluster.yml`:

```yaml
# 是否开启自动更新证书，推荐开启。
auto_renew_certificates: true
```

## 准备机器列表

拿到集群部署的初始机器内网 ip 列表，修改 `inventory/mycluster/inventory.ini`:

```ini
[all]
10.10.6.13
10.10.6.9
10.10.6.6

[kube_control_plane]
10.10.6.13
10.10.6.9
10.10.6.6

[etcd]
10.10.6.13
10.10.6.9
10.10.6.6

[kube_node]
10.10.6.13
10.10.6.9
10.10.6.6
```

## 国内环境安装

在国内进行安装时，会因 GFW 影响而安装失败，参考 [kubespray 离线安装配置](offline.md)。

## 部署集群

```bash
ansible-playbook -i inventory/mycluster/inventory.ini --private-key id_rsa --user=ubuntu --become --become-user=root cluster.yml
```