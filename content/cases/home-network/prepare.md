# 云原生环境准备工作

## 安装 k3s

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

## 应用部署与配置维护方式

所有应用使用 kubernetes 的 YAML 进行声明式部署，YAML 通过 kustomize 引用，应用的相关配置文件通过 kustomize 自动生成相关的 ConfigMap 或 Secret 挂载进去。

如果应用使用 helm chart 渲染，在 kustomize 中也可以被引用。
