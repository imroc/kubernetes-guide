# K3S 安装与声明式配置管理方式

## K3S: 精简的 K8S

要打造云原生家庭网络，还需要为路由器搭建一套云原生环境，也就是安装一套 Kubernetes 集群。由于路由器是单机，且计算资源有限，所以应该安装一套精简的 K8S 集群，经过一些调研和体验，包括 microk8s、k0s、k3d、k3s、kind、minikube 等工具，最终选择了用 k3s 来搭建集群。

## 安装 K3S

路由器在国内，安装 k3s 使用国内的 mirror 一键安装：

```bash
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server \
	--disable-network-policy \
	--disable-cloud-controller \
	--disable-helm-controller \
	--data-dir=/data/k3s \
	--disable=traefik,local-storage,metrics-server
```

要点解析：
* 作为路由器，不需要用到很多高级能力，安装的时候将不需要的能力禁用下，以便让 k3s 更加精简。
* 如果有数据盘，或者插了移动硬盘，挂载到 `/data` 目录，可以指定 k3s 的数据目录使用该目录下的子目录，节约系统盘容量。

> 后续要升级也使用上面相同的命令，参考 [k3s 官方安装文挡](https://docs.k3s.io/zh/quick-start)

## 镜像加速方案

安装应用需要拉取相应的容器镜像，基本来自 DockerHub，在国内拉取 DockerHub 速度较慢，可以考虑以下几种方案进行加速。

### 方案一：配置镜像加速地址

你可以找到一个靠谱的镜像加速器地址，或者自己搭建一个镜像加速器，然后配置创建 K3S 配置文件 `/etc/rancher/k3s/registries.yaml`：

```yaml
mirrors:
  docker.io:
    endpoint:
      - "https://docker.m.daocloud.io" # 注意替换镜像加速器地址
```

重启 K3S 生效：

```bash
systemctl restart k3s
```

### 方案二：透明代理加速

如果你有代理可以访问到 DockerHub，可以先将透明代理客户端用容器部署好，再部署其它应用。

而透明代理依赖的镜像又该如何拉取呢？你可以直接从 DockerHub 拉取，慢就慢点，等代理部署好后拉其它的镜像就快了。

或者你也可以手动将镜像打包成文件：

```bash
docker save your/proxy-image > image.tar
```

然后将 `image.tar` 拷贝到路由器上，通过 `ctr` 导入进来：

```bash
ctr -n k8s.io -a /run/k3s/containerd/containerd.sock image import image.tar
```

> `ctr` 命令是安装 k3s 后自带的命令。

## 声明式配置维护方式

### 使用 kustomize 维护配置

我们使用 `kustomize` 维护 YAML 和应用所需的配置：
1. 使用 `kubernetes` 的 YAML 进行声明式部署，YAML 通过 `kustomize` 引用。
2. 应用的相关配置文件通过 `kustomize` 引用并自动生成相应的 `ConfigMap` 或 `Secret` ，挂载到 Pod 中被应用使用。
3. 如果应用使用 helm chart 渲染，在 `kustomize` 中也可以被引用。
4. 每个应用使用一个目录来声明所有 YAML 和所需配置，

举个例子，部署 `dnsmasq` 时使用如下的 `kustomize` 目录结构：

```yaml
dnsmasq
├── config
│   └── dnsmasq.conf
├── daemonset.yaml
└── kustomization.yaml
```

其中 `daemonset.yaml` 是 dnsmasq Daemonset 的 YAML 声明，在 `kustomization.yaml` 中通过 `resources` 引用：

```yaml
resources:
  - daemonset.yaml
```

而 `dnsmasq` 应用所需的配置文件 `dnsmasq` 通过 `configMapGenerator` 来生成：

```yaml
configMapGenerator:
  - name: dnsmasq-config
    files:
      - config/dnsmasq.conf
```

在 `daemonset.yaml` 中引用并挂载该 ConfigMap：

```yaml
  template:
    ...
    spec:
      containers:
        - name: dnsmasq
          ...
          volumeMounts:
            - mountPath: /etc/dnsmasq.conf
              name: dnsmasq-config
              subPath: dnsmasq.conf
      volumes:
        - configMap:
            name: dnsmasq-config
          name: dnsmasq-config
```

> 最终渲染出的 YAML，生产的 ConfigMap 名称会加上一个 hash 后缀，由 ConfigMap 内容决定，如果内容有变动，hash 后缀也会变动，所以只要配置文件变化就会触发 Pod 重建，也就实现了应用的配置重新加载。

最后，在目录内执行以下命令将应用安装到 k3s:

```bash
kustomize build --enable-helm --load-restrictor=LoadRestrictionsNone . | kubectl apply -f -
```

> `kustomize` 已经内置到了 `kubectl`，你也可以不用安装 `kustomize`，直接使用 `kubectl kustomize` 子命令代替 `kustomize`。

如果要一键部署所有应用，可以在上层目录中再建一个 `kustomization.yaml` 引用所有应用的目录，然后在上层目录中执行上面相同的命令可以实现所有应用的一键部署。

### 声明 YAML 需遵循的原则

使用云原生的方式主要为了实现容器化、声明式管理的能力，不引入其它复杂的特性，所以考虑在声明 YAML 时遵循以下原则：
* 使用 `DaemonSet` 这种类型的工作负载进行部署，保证只有一个副本，滚动更新策略为先销毁旧的，再创建新的。
* 使用 `HostNetwork`，不使用容器网络。
* 使用特权容器，避免因权限导致的各种问题。
* 如果数据需要持久化，挂载 `HostPath`。
