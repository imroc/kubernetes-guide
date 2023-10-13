# 排查 Pod ImagePullBackOff

## http 类型 registry，地址未加入到 insecure-registry

dockerd 默认从 https 类型的 registry 拉取镜像，如果使用 https 类型的 registry，则必须将它添加到 insecure-registry 参数中，然后重启或 reload dockerd 生效。

## https 自签发类型 resitry，没有给节点添加 ca 证书

如果 registry 是 https 类型，但证书是自签发的，dockerd 会校验 registry 的证书，校验成功才能正常使用镜像仓库，要想校验成功就需要将 registry 的 ca 证书放置到 `/etc/docker/certs.d/<registry:port>/ca.crt` 位置。

## 私有镜像仓库认证失败

如果 registry 需要认证，但是 Pod 没有配置 imagePullSecret，配置的 Secret 不存在或者有误都会认证失败。

## 镜像文件损坏

如果 push 的镜像文件损坏了，下载下来也用不了，需要重新 push 镜像文件。

## 镜像拉取超时

如果节点上新起的 Pod 太多就会有许多可能会造成容器镜像下载排队，如果前面有许多大镜像需要下载很长时间，后面排队的 Pod 就会报拉取超时。

kubelet 默认串行下载镜像:

``` txt
--serialize-image-pulls   Pull images one at a time. We recommend *not* changing the default value on nodes that run docker daemon with version < 1.9 or an Aufs storage backend. Issue #10959 has more details. (default true)
```

也可以开启并行下载并控制并发:

``` txt
--registry-qps int32   If > 0, limit registry pull QPS to this value.  If 0, unlimited. (default 5)
--registry-burst int32   Maximum size of a bursty pulls, temporarily allows pulls to burst to this number, while still not exceeding registry-qps. Only used if --registry-qps > 0 (default 10)
```

## 镜像不不存在

kubelet 日志:

``` bash
PullImage "imroc/test:v0.2" from image service failed: rpc error: code = Unknown desc = Error response from daemon: manifest for imroc/test:v0.2 not found
```