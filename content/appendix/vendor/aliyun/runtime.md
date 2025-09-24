# ACK 的节点基础组件

## containerd

### 版本信息

```bash
$ containerd --version
containerd github.com/containerd/containerd/v2 v2.1.3 05ac95a2d4aa0ae5ec8298e867e0a0185dd80236
```

### systemd 配置

<FileBlock file="vendor/aliyun/containerd.service" showLineNumbers language="systemd" title="/etc/systemd/system/containerd.service" />

### containerd 配置

<FileBlock file="vendor/aliyun/containerd-config.toml" showLineNumbers title="/etc/containerd/config.toml" />

## kubelet

### 启动参数

```bash
root        2165       1  0 10:11 ?        00:00:20 /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --pod-manifest-path=/etc/kubernetes/manifests --v=3 --authorization-mode=Webhook --authentication-token-webhook=true --anonymous-auth=false --client-ca-file=/etc/kubernetes/pki/ca.crt --container-runtime-endpoint=/var/run/containerd/containerd.sock --cgroup-driver=systemd --node-labels=alibabacloud.com/nodepool-id=np7c4f1ce4799742d7b300248362d8d53d,ack.aliyun.com=ca133aaf80fd542038acda778fbbf93a1 --rotate-certificates=true --cert-dir=/var/lib/kubelet/pki --node-ip=0.0.0.0 --config=/var/lib/kubelet/ack-managed-config.yaml --hostname-override=cn-hangzhou.10.0.0.238 --cluster-dns=192.168.0.10 --cloud-provider=external --provider-id=cn-hangzhou.i-bp16qq4fgg0o7ecm6hm1 --enable-controller-attach-detach=true
```

### systemd 配置

<FileBlock file="vendor/aliyun/kubelet.service" showLineNumbers language="systemd" title="/etc/systemd/system/kubelet.service" />
