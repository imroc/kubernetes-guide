# GKE 的容器运行时

## 概述

GKE 标准集群使用 containerd 作为容器运行时，本文分析配置（基于 GKE v1.34）。

## containerd 配置

<FileBlock file="vendor/gcloud/containerd-config.toml" showLineNumbers title="/etc/containerd/config.toml" />

## containerd systemd 配置

<FileBlock file="vendor/gcloud/containerd.service" showLineNumbers title="/usr/lib/systemd/system/containerd.service" language="systemd" />

## containerd 版本

```bash
$ containerd --version
containerd github.com/containerd/containerd/v2 2.0.6 991cc3363c290ffd074e069f2b3034c7286ecbe0
```

## kubelet 启动参数

```bash
/home/kubernetes/bin/kubelet --v=2 --cloud-provider=external --experimental-mounter-path=/home/kubernetes/containerized_mounter/mounter --cert-dir=/var/lib/kubelet/pki/ --kubeconfig=/var/lib/kubelet/kubeconfig --image-credential-provider-config=/etc/srv/kubernetes/cri_auth_config.yaml --image-credential-provider-bin-dir=/home/kubernetes/bin --max-pods=110 --node-labels=cloud.google.com/gke-boot-disk=pd-balanced,cloud.google.com/gke-container-runtime=containerd,cloud.google.com/gke-cpu-scaling-level=2,cloud.google.com/gke-logging-variant=DEFAULT,cloud.google.com/gke-max-pods-per-node=110,cloud.google.com/gke-memory-gb-scaling-level=4,cloud.google.com/gke-nodepool=default-pool,cloud.google.com/gke-os-distribution=cos,cloud.google.com/gke-provisioning=standard,cloud.google.com/gke-stack-type=IPV4,cloud.google.com/machine-family=e2,cloud.google.com/private-node=false --volume-plugin-dir=/home/kubernetes/flexvolume --node-status-max-images=25 --container-runtime-endpoint=unix:///run/containerd/containerd.sock --runtime-cgroups=/system.slice/containerd.service --registry-qps=10 --registry-burst=20 --config /home/kubernetes/kubelet-config.yaml --pod-sysctls=net.core.optmem_max=20480,net.core.somaxconn=1024,net.ipv4.conf.all.accept_redirects=0,net.ipv4.conf.all.forwarding=1,net.ipv4.conf.all.route_localnet=1,net.ipv4.conf.default.forwarding=1,net.ipv4.ip_forward=1,net.ipv4.tcp_fin_timeout=60,net.ipv4.tcp_keepalive_intvl=60,net.ipv4.tcp_keepalive_probes=5,net.ipv4.tcp_keepalive_time=300,net.ipv4.tcp_rmem=4096 87380 6291456,net.ipv4.tcp_syn_retries=6,net.ipv4.tcp_tw_reuse=0,net.ipv4.tcp_wmem=4096 16384 4194304,net.ipv4.udp_rmem_min=4096,net.ipv4.udp_wmem_min=4096,net.ipv6.conf.all.disable_ipv6=1,net.ipv6.conf.default.accept_ra=0,net.ipv6.conf.default.disable_ipv6=1,net.netfilter.nf_conntrack_generic_timeout=600,net.netfilter.nf_conntrack_tcp_be_liberal=1,net.netfilter.nf_conntrack_tcp_timeout_close_wait=3600,net.netfilter.nf_conntrack_tcp_timeout_established=86400 --version=v1.34.0-gke.1662000
```

## kubelet 配置

<FileBlock file="vendor/gcloud/kubelet-config.yaml" showLineNumbers title="/etc/kubernetes/kubelet-config.yaml" />
