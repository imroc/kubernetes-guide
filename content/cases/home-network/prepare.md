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

使用 kubernetes 的 YAML 进行声明式部署，YAML 通过 kustomize 引用，应用的相关配置文件通过 kustomize 自动生成相关的 ConfigMap 或 Secret 挂载进去。如果应用使用 helm chart 渲染，在 kustomize 中也可以被引用。

每个应用使用一个目录来声明所有 yaml 和所需配置，在目录内执行以下命令安装到 k3s:

```bash
kustomize build --enable-helm --load-restrictor=LoadRestrictionsNone . | kubectl apply -f -。
```

如果要一键部署，在上层目录中再建一个 `kustomization.yaml` 引用所有应用的目录，然后在上层目录中执行上面相同的命令可以实现所有应用一键部署。

## YAML 声明方式

使用云原生的方式主要为了实现容器化、声明式管理的能力，不引入其它复杂的特性，所以考虑：

* 使用 Daemonset 这种类型的工作负载进行部署，保证只有一个副本，滚动更新策略为先销毁旧的，再创建新的。
* 使用 HostNetwork，不使用容器网络。
* 使用特权容器，避免因权限导致的各种问题。
* 如果数据需要持久化，挂载 hostPath。
