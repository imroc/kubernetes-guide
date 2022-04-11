# kubespray 离线安装配置

## 背景

在国内使用 kubespray 安装 Kubernetes 集群，下载依赖的文件和镜像时，往往会遇到下载失败，这时我们可以利用 kubespray 离线安装配置的能力来部署集群。

## 准备工作

1 一台不受 GFW 限制的服务器或 PC，用于下载安装 Kubernetes 所依赖的海外文件和镜像。
2. 一个用于离线安装的静态服务器，存储安装集群所需的二进制静态文件。通常使用 nginx 搭建静态服务器即可。
3. 一个用于离线安装的镜像仓库，存储安装集群所需的依赖镜像。比如自己搭建的 Harbor，只要网络可以通，能够正常拉取到镜像即可。

## 生成依赖文件和镜像的列表

```bash
$ cd contrib/offline
$ bash generate_list.sh
$ tree temp/
temp/
├── files.list
├── files.list.template
├── images.list
└── images.list.template
```

* `flies.list` 是依赖文件的列表。
* `images.list` 是依赖镜像的列表。

## 搬运文件

执行以下命令将依赖的静态文件全部下载到 `temp/files` 目录下:

```bash
wget -x -P temp/files -i temp/files.list
```

将静态文件通过静态服务器暴露出来，比如使用 nginx，根据情况修改 nginx 配置，比如:

```nginx.conf
user root;
server {
        listen 80 default_server;
        listen [::]:80 default_server;
        location /k8s/ {
                alias /root/kubespray/contrib/offline/temp/files/;
        }
}
```

## 搬运镜像

我们可以使用 [skopeo](https://github.com/containers/skopeo) 将依赖的镜像同步到我们自己的镜像仓库，安装方法参考 [官方安装文档](https://github.com/containers/skopeo/blob/main/install.md)。

安装好后，登录下自己的镜像仓库:

```bash
$ skopeo login cr.imroc.cc
Username: admin
Password:
Login Succeeded!
```

然后将所有依赖镜像同步到我们自己的镜像仓库:

```bash
for image in $(cat temp/images.list); do skopeo copy docker://${image} docker://cr.imroc.cc/k8s/${image#*/}; done
```

注意事项:
1. 替换成自己的仓库地址。
2. 提前创建好仓库，比如用 harbor，提前创建好名为 "k8s" 的项目，以便将所有镜像都同步到 "k8s" 这个项目路径下。
3. 如果直接二进制安装 skopeo，需提前创建好配置文件 `/etc/containers/policy.json`，内容可以用默认的，参考 [default-policy.json](https://github.com/containers/skopeo/blob/main/default-policy.json)。

## 修改 offline.yml

搬运好了文件和镜像，我们来修改下 kubespray 的地址，让依赖的文件和镜像下载地址使用我们自己的地址，修改 `/root/kubespray/inventory/mycluster/group_vars/all/offline.yml`:

```yaml
# 替换镜像地址
registry_host: "cr.imroc.cc/k8s"
kube_image_repo: "{{ registry_host }}"
gcr_image_repo: "{{ registry_host }}"
github_image_repo: "{{ registry_host }}"
docker_image_repo: "{{ registry_host }}"
quay_image_repo: "{{ registry_host }}"
etcd_image_repo: "{{ quay_image_repo }}/etcd"
flannel_image_repo: "{{ quay_image_repo }}/flannel"
calico_node_image_repo: "{{ quay_image_repo }}/node"
calico_cni_image_repo: "{{ quay_image_repo }}/cni"
calico_flexvol_image_repo: "{{ quay_image_repo }}/pod2daemon-flexvol"
calico_policy_image_repo: "{{ quay_image_repo }}/kube-controllers"
calico_typha_image_repo: "{{ quay_image_repo }}/typha"
pod_infra_image_repo: "{{ kube_image_repo }}/pause"
install_socat_image_repo: "{{ docker_image_repo }}/install-socat"
netcheck_agent_image_repo: "{{ docker_image_repo }}/k8s-netchecker-agent"
netcheck_server_image_repo: "{{ docker_image_repo }}/k8s-netchecker-server"
weave_kube_image_repo: "{{ docker_image_repo }}/weave-kube"
weave_npc_image_repo: "{{ docker_image_repo }}/weave-npc"
cilium_image_repo: "{{ quay_image_repo }}/cilium"
cilium_init_image_repo: "{{ quay_image_repo }}/cilium-init"
cilium_operator_image_repo: "{{ quay_image_repo }}/operator"
cilium_hubble_relay_image_repo: "{{ quay_image_repo }}/hubble-relay"
cilium_hubble_certgen_image_repo: "{{ quay_image_repo }}/certgen"
cilium_hubble_ui_image_repo: "{{ quay_image_repo }}/hubble-ui"
cilium_hubble_ui_backend_image_repo: "{{ quay_image_repo }}/hubble-ui-backend"
cilium_hubble_envoy_image_repo: "{{ docker_image_repo }}/envoy"
kube_ovn_container_image_repo: "{{ docker_image_repo }}/kube-ovn"
kube_router_image_repo: "{{ docker_image_repo }}/kube-router"
multus_image_repo: "{{ github_image_repo }}/multus-cni"
nginx_image_repo: "{{ docker_image_repo }}/nginx"
haproxy_image_repo: "{{ docker_image_repo }}/haproxy"
coredns_image_repo: "{{ kube_image_repo }}/coredns }}"
nodelocaldns_image_repo: "{{ kube_image_repo }}/k8s-dns-node-cache"
dnsautoscaler_image_repo: "{{ kube_image_repo }}/cluster-proportional-autoscaler-{{ image_arch }}"
registry_image_repo: "{{ docker_image_repo }}/registry"
metrics_server_image_repo: "{{ kube_image_repo }}/metrics-server"
local_volume_provisioner_image_repo: "{{ kube_image_repo }}/local-volume-provisioner"
cephfs_provisioner_image_repo: "{{ quay_image_repo }}/cephfs-provisioner"
rbd_provisioner_image_repo: "{{ quay_image_repo }}/rbd-provisioner"
local_path_provisioner_image_repo: "{{ docker_image_repo }}/local-path-provisioner"
ingress_nginx_controller_image_repo: "{{ kube_image_repo }}/controller"
cert_manager_controller_image_repo: "{{ quay_image_repo }}/cert-manager-controller"
cert_manager_cainjector_image_repo: "{{ quay_image_repo }}/cert-manager-cainjector"
cert_manager_webhook_image_repo: "{{ quay_image_repo }}/cert-manager-webhook"
csi_attacher_image_repo: "{{ kube_image_repo }}/csi-attacher"
csi_provisioner_image_repo: "{{ kube_image_repo }}/csi-provisioner"
csi_snapshotter_image_repo: "{{ kube_image_repo }}/csi-snapshotter"
csi_resizer_image_repo: "{{ kube_image_repo }}/csi-resizer"
csi_node_driver_registrar_image_repo: "{{ kube_image_repo }}/csi-node-driver-registrar"
csi_livenessprobe_image_repo: "{{ kube_image_repo }}/livenessprobe"
snapshot_controller_image_repo: "{{ kube_image_repo }}/snapshot-controller"
cinder_csi_plugin_image_repo: "{{ docker_image_repo }}/cinder-csi-plugin"
dashboard_image_repo: "{{ docker_image_repo }}/dashboard-{{ image_arch }}"
dashboard_metrics_scraper_repo: "{{ docker_image_repo }}/metrics-scraper"
metallb_speaker_image_repo: "{{ quay_image_repo }}/speaker"
metallb_controller_image_repo: "{{ quay_image_repo }}/controller"

# 替换静态文件地址
files_repo: "http://10.10.10.14/k8s"
kubeadm_download_url: "{{ files_repo }}/storage.googleapis.com/kubernetes-release/release/{{ kube_version }}/bin/linux/{{ image_arch }}/kubeadm"
kubectl_download_url: "{{ files_repo }}/storage.googleapis.com/kubernetes-release/release/{{ kube_version }}/bin/linux/{{ image_arch }}/kubectl"
kubelet_download_url: "{{ files_repo }}/storage.googleapis.com/kubernetes-release/release/{{ kube_version }}/bin/linux/{{ image_arch }}/kubelet"
cni_download_url: "{{ files_repo }}/github.com/containernetworking/plugins/releases/download/{{ cni_version }}/cni-plugins-linux-{{ image_arch }}-{{ cni_version }}.tgz"
crictl_download_url: "{{ files_repo }}/github.com/kubernetes-sigs/cri-tools/releases/download/{{ crictl_version }}/crictl-{{ crictl_version }}-{{ ansible_system | lower }}-{{ image_arch }}.tar.gz"
etcd_download_url: "{{ files_repo }}/github.com/etcd-io/etcd/releases/download/{{ etcd_version }}/etcd-{{ etcd_version }}-linux-{{ image_arch }}.tar.gz"
calicoctl_download_url: "{{ files_repo }}/github.com/projectcalico/calico/releases/download/{{ calico_ctl_version }}/calicoctl-linux-{{ image_arch }}"
calico_crds_download_url: "{{ files_repo }}/github.com/projectcalico/calico/archive/{{ calico_version }}.tar.gz"
flannel_cni_download_url: "{{ files_repo }}/github.com/flannel-io/cni-plugin/releases/download/{{ flannel_cni_version }}/flannel-{{ image_arch }}"
helm_download_url: "{{ files_repo }}/get.helm.sh/helm-{{ helm_version }}-linux-{{ image_arch }}.tar.gz"
crun_download_url: "{{ files_repo }}/github.com/containers/crun/releases/download/{{ crun_version }}/crun-{{ crun_version }}-linux-{{ image_arch }}"
kata_containers_download_url: "{{ files_repo }}/github.com/kata-containers/kata-containers/releases/download/{{ kata_containers_version }}/kata-static-{{ kata_containers_version }}-{{ ansible_architecture }}.tar.xz"
runc_download_url: "{{ files_repo }}/github.com/opencontainers/runc/releases/download/{{ runc_version }}/runc.{{ image_arch }}"
containerd_download_url: "{{ files_repo }}/github.com/containerd/containerd/releases/download/v{{ containerd_version }}/containerd-{{ containerd_version }}-linux-{{ image_arch }}.tar.gz"
nerdctl_download_url: "{{ files_repo }}/github.com/containerd/nerdctl/releases/download/v{{ nerdctl_version }}/nerdctl-{{ nerdctl_version }}-{{ ansible_system | lower }}-{{ image_arch }}.tar.gz"
krew_download_url: "{{ files_repo }}/github.com/kubernetes-sigs/krew/releases/download/{{ krew_version }}/krew-{{ host_os }}_{{ image_arch }}.tar.gz"
cri_dockerd_download_url: "{{ files_repo }}/github.com/Mirantis/cri-dockerd/releases/download/{{ cri_dockerd_version }}/cri-dockerd-{{ cri_dockerd_version }}-linux-{{ image_arch }}.tar.gz"
gvisor_runsc_download_url: "{{ files_repo }}/storage.googleapis.com/gvisor/releases/release/{{ gvisor_version }}/{{ ansible_architecture }}/runsc"
gvisor_containerd_shim_runsc_download_url: "{{ files_repo }}/storage.googleapis.com/gvisor/releases/release/{{ gvisor_version }}/{{ ansible_architecture }}/containerd-shim-runsc-v1"
youki_download_url: "{{ files_repo }}/github.com/containers/youki/releases/download/v{{ youki_version }}/youki_v{{ youki_version | regex_replace('\\.', '_') }}_linux.tar.gz"
```

> `xxx_download_url` 不是直接 uncomment 得到的，是通过 `images.list.template` 里的内容加上 `{{ files_repo }}` 拼接而来。
