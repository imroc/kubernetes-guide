# 安装 k3s

路由器在国内，安装 k3s 使用国内的 mirror 一键安装：

```bash
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server \
	--disable-network-policy \
	--disable-cloud-controller \
	--disable-helm-controller \
	--data-dir=/data/k3s \
	--disable=traefik,local-storage,metrics-server
```

> 参考 [k3s 官方安装文挡](https://docs.k3s.io/zh/quick-start)

