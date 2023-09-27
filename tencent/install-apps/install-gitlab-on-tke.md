# 自建 Gitlab 代码仓库

本文介绍如何在腾讯云容器服务上部署 Gitlab 代码仓库。

## 前提条件

* 已安装 [Helm](https://helm.sh)。
* 已开启集群访问并配置好 kubeconfig，可以通过 kubectl 操作集群(参考[官方文档:连接集群](https://cloud.tencent.com/document/product/457/32191))。

## 准备 chart

Gitlab 官方提供了 helm chart，可以下载下来:

```bash
helm repo add gitlab https://charts.gitlab.io/
helm fetch gitlab/gitlab --untar
helm fetch gitlab/gitlab-runner --untar
```

> 参考 [Gitlab 官方文档: Deployment Guide](https://docs.gitlab.com/charts/installation/deployment.html)

不过要愉快的部署到腾讯云容器服务，要修改的配置项较多:
* 如果存储使用默认的云硬盘(cbs)，容量必须是 10Gi 的倍数，官方 chart 有一些 8Gi 的定义，会导致 pvc 一直 pending，pod 也一致 pending，需要修改一下配置。
* gitlab 相关组件的容器镜像地址使用的是 gitlab 官方的镜像仓库，在国内拉取可能会失败，需要同步到国内并修改镜像地址。
* 很多组件和功能可能用不到，建议是最小化安装，不需要的通通禁用，如 nginx-ingress, cert-manager, prometheus 等。
* 服务暴露方式和 TLS 证书管理，不同平台差异比较大，建议是单独管理，helm 安装时只安装应用本身，ingress 和 tls 相关配置禁用掉。

修改这些配置比较繁琐，我已经维护了一份 Gitlab 适配腾讯云容器服务的 chart 包，相关 gitlab 镜像也做了同步，可以实现一键安装。可以通过 git 拉下来:

```bash
git clone https://github.com/tke-apps/gitlab.git
cd gitlab
```

## StorageClass 注意事项

像 gitaly, minio 这些组件，是需要挂载持久化存储的，在腾讯云容器服务，默认使用的是云硬盘(CBS)，块存储，通常也建议使用这种，不过在使用之前，建议确保默认 StorageClass 支持磁盘容量在线扩容，这个特性需要确保集群版本在 1.18 以上，且安装了 CBS CSI 插件(Out-of-Tree)，新版本集群默认会安装。

然后找到默认 StorageClass，通常名为 "cbs":

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721150831.png)

编辑 yaml:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721151305.png)

先确保以下两点，如果不满足，可以删除重建:
* 默认 StorageClass 的 `is-default-class` 注解为 true。
* provisioner 是 `com.tencent.cloud.csi.cbs`。

如果满足，添加字段 `allowVolumeExpansion: true` 并保存。

另外，也可以通过 kubectl 修改，先查询 default StorageClass:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721151628.png)

然后使用 `kubectl edit sc <NAME>` 进行修改。

## 部署 Gitlab

### 准备配置

创建 `gitlab.yaml` 配置，分享一下我的配置:

```yaml
redis:
  install: true
  master:
    nodeSelector: 
      node.kubernetes.io/instance-type: eklet
    persistence:
      enabled: false
postgresql:
  install: false
minio:
  persistence:
    enabled: true
    volumeName: gitlab-minio
    accessMode: ReadWriteMany
    size: '100Gi'
gitlab:
  gitaly:
    persistence:
      enabled: true
      volumeName: 'gitlab-gitaly'
      accessMode: ReadWriteMany
      size: 100Gi
global:
  hosts:
    domain: imroc.cc
    https: true
    gitlab:
      name: gitlab.imroc.cc
      https: true
  nodeSelector: 
    node.kubernetes.io/instance-type: eklet
  psql:
    password:
      useSecret: true
      secret: gitlab-psql-password-secret
      key: password
    host: 'pgsql-postgresql.db'
    port: 5432
    username: gitlab
    database: gitlab
```

* redis 作为缓存，不想持久化数据，降低成本。
* postgresql 使用现有的数据库，不安装，配置上数据库连接信息(数据库密码通过secret存储，提前创建好)。
* minio 和 gitaly 挂载的存储，使用了 NFS，提前创建好 pv，在 `persistence` 配置里指定 `volumeName` 来绑定 pv。
* 我的集群是标准集群，有普通节点和超级节点，我希望 gitlab 所有组件都调度到超级节点，global 和 redis 与 minio 里指定 nodeSelector，强制调度到超级节点。
* 服务暴露方式我用的 istio-ingressgateway，证书也配到 gateway 上的，对外访问方式是 https，在 `global.hosts` 下配置对外访问域名，`https` 置为 true(用于页面内的连接跳转，避免https页面跳到http链接)。


`gitlab-psql-password-secret.yaml`(存 postgresql 密码的 secret):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-psql-password-secret
  namespace: gitlab
type: Opaque
stringData:
  password: '123456'
```

gitaly 和 minio 挂载的存储我使用 NFS，提前创建好 CFS 实例和相应的文件夹路径，并 `chmod 0777 <DIR>` 修改目录权限，避免因权限问题导致 pod 启动失败。以下分别是它们的 pv yaml 定义:

`minio-nfs-pv.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: gitlab-minio
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 100Gi
  nfs:
    path: /gitlab/minio
    server: 10.10.0.15
  persistentVolumeReclaimPolicy: Retain
  volumeMode: Filesystem
  storageClassName: 'cbs'
```

`gitaly-nfs-pv.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: gitlab-gitaly
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 100Gi
  nfs:
    path: /gitlab/gitaly
    server: 10.10.0.15
  persistentVolumeReclaimPolicy: Retain
  volumeMode: Filesystem
  storageClassName: 'cbs'
```

* `storageClassName` 我使用默认的 StorageClass 名称，因为部署配置里没指定 storageClass 会自动给 pvc 加上默认的，如果 pv 跟 pvc 的 `storageClassName` 不匹配，会导致调度失败。

上述 pv 和 secret 是 gitlab 应用依赖的，需要在部署 gitlab 之前先 apply 到集群:

```bash
kubectl apply -f gitlab-psql-password-secret.yaml
kubectl apply -f minio-nfs-pv.yaml
kubectl apply -f gitaly-nfs-pv.yaml
```

### 安装 gitlab

使用 helm 安装:

```bash
helm upgrade -n gitlab --install gitlab -f gitlab.yaml ./gitlab
```

检查 gitlab 组件是否正常运行:

```bash
$ kubectl -n gitlab get pod
NAME                                          READY   STATUS      RESTARTS   AGE
gitlab-gitaly-0                               1/1     Running     0          8m
gitlab-gitlab-exporter-7bc89d678-d4c7h        1/1     Running     0          8m
gitlab-gitlab-shell-77d99c8b45-kbfmd          1/1     Running     0          8m
gitlab-kas-549b4cf77c-thjrv                   1/1     Running     0          8m
gitlab-migrations-1-2pnx7                     0/1     Completed   0          8m
gitlab-minio-7b57f77ccb-g9mqb                 1/1     Running     0          8m
gitlab-minio-create-buckets-1-hvz9g           0/1     Completed   0          6m
gitlab-redis-master-0                         2/2     Running     0          6m
gitlab-sidekiq-all-in-1-v2-5f8c64987f-jhtv9   1/1     Running     0          8m
gitlab-toolbox-66bbb6d4dc-qff92               1/1     Running     0          8m
gitlab-webservice-default-868fbf9fbc-9cb8g    2/2     Running     0          8m
```

> 后续想卸载可使用这个命令: `helm -n gitlab uninstall gitlab`

### 暴露 Gitlab 服务

查看 service:

```bash
$ kubectl -n gitlab get service
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                               AGE
gitlab-gitaly               ClusterIP   None             <none>        8075/TCP,9236/TCP                     8m
gitlab-gitlab-exporter      ClusterIP   172.16.189.22    <none>        9168/TCP                              8m
gitlab-gitlab-shell         ClusterIP   172.16.251.106   <none>        22/TCP                                8m
gitlab-kas                  ClusterIP   172.16.245.70    <none>        8150/TCP,8153/TCP,8154/TCP,8151/TCP   8m
gitlab-minio-svc            ClusterIP   172.16.187.127   <none>        9000/TCP                              8m
gitlab-redis-headless       ClusterIP   None             <none>        6379/TCP                              8m
gitlab-redis-master         ClusterIP   172.16.156.40    <none>        6379/TCP                              8m
gitlab-redis-metrics        ClusterIP   172.16.196.188   <none>        9121/TCP                              8m
gitlab-webservice-default   ClusterIP   172.16.143.4     <none>        8080/TCP,8181/TCP,8083/TCP            8m
```

其中带 `webservice` 的 service 是 Gitlab 访问总入口，需要特别注意的是，端口是 8181，不是 8080 那个。

我使用 istio-ingressgateway，Gateway 本身已提前监听好 443 并挂好证书:

```bash
kubectl -n external get gw imroc -o yaml
```

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: imroc
  namespace: external
spec:
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: HTTPS-443-pp0c
      protocol: HTTPS
    hosts:
    - imroc.cc
    - "*.imroc.cc"
    tls:
      mode: SIMPLE
      credentialName: imroc-cc-crt-secret
```

只需创建一个 VirtualService，将 gitlab 服务与 Gateway 绑定，暴露出去。

`gitlab-vs.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: gitlab-imroc-cc
  namespace: gitlab
spec:
  gateways:
  - external/imroc
  hosts:
  - 'gitlab.imroc.cc'
  http:
  - route:
    - destination:
        host: gitlab-webservice-default
        port:
          number: 8181 # 注意这里端口是 8181，不是 8080
```

执行创建:

```bash
kubectl apply -f gitlab-vs.yaml
```

除了暴露 https，如果需要通过 ssh 协议来 push 或 pull 代码，需要暴露 22 端口，使用单独的 Gateway 对象来暴露(绑定同一个 ingressgateway)，`shell-gw.yaml`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: shell
  namespace: external
spec:
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  servers:
  - port:
      number: 22
      name: shell
      protocol: TCP
    hosts:
    - "*"
```

创建 Gateway:

```bash
kubectl apply -f shell-gw.yaml
```

为 22 端口创建 VirtualService 并绑定 Gateway，`gitlab-shell-vs.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: gitlab-shell
  namespace: gitlab
spec:
  gateways:
  - external/shell
  hosts:
  - '*'
  tcp:
  - match:
    - port: 22
    route:
    - destination:
        host: gitlab-gitlab-shell
        port:
          number: 22
```

创建 VirutalService:

```bash
kubectl apply -f gitlab-shell-vs.yaml
```

### 获取 root 初始密码并登录

服务暴露出来之后，确保 DNS 也正确配置，解析到网关的 IP，我这里则是 istio-ingressgateway 对应的 CLB 的外网 IP。

在浏览器中打开 gitlab 外部地址:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721115146.png)

自动跳转到登录页面，管理员用户名为 root，密码可通过自动生成的 secret 获取:

```bash
$ kubectl -n gitlab get secret | grep initial-root-password
gitlab-gitlab-initial-root-password   Opaque                                1      38m
$ kubectl -n gitlab get secret gitlab-gitlab-initial-root-password -o jsonpath='{.data.password}' | base64 -d
kxe***********************************************************k5
```

拿到密码后输入然后登录即可。

## 部署并注册 gitlab-runner

Gitlab 有很强大的 CI 功能，我们可以在集群中也部署一下 gitlab-runner，如果为代码仓库设置了 CI 流程，可以自动将任务分发给 gitlab-runner 去执行 CI 任务，每个任务再创建单独的 Pod 去运行:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/gitlab-runner-arch.png)

下面介绍 gitlab-runner 的部署与注册方法。

### 获取注册 token

在【Admin】-【Overview】-【Runners】 复制注册 token:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721115450.png)

也可以通过 kubectl 获取 secret 得到 token:

```bash
$ kubectl -n gitlab get secret gitlab-gitlab-runner-secret -o jsonpath='{.data.runner-registration-token}' | base64 -d
AF************************************************************kF
```

### 准备配置

`gitlab-runner.yaml`:

```yaml
runnerRegistrationToken: AF************************************************************kF
gitlabUrl: 'https://gitlab.imroc.cc'
runners:
  locked: false
  config: |
    [[runners]]
      environment = ["FF_USE_LEGACY_KUBERNETES_EXECUTION_STRATEGY=1"]
      [runners.kubernetes]
      image = "ubuntu:20.04"
```

注意:
* `runnerRegistrationToken` 替换为上一步获取到的 token。
* `gitlabUrl` 替换为 gitlab 访问地址。
* 超级节点(EKS)的 Pod，不支持 attach，如果 runner 调度到超级节点(EKS) 就会有问题，打开 runer [FF_USE_LEGACY_KUBERNETES_EXECUTION_STRATEGY](https://docs.gitlab.com/runner/configuration/feature-flags.html#available-feature-flags) 的 feature flag 来换成 exec 方式。

### 安装 gitlab-runner

使用 helm 安装:

```bash
helm upgrade -n gitlab --install gitlab-runner -f gitlab-runner.yaml ./gitlab-runner
```

检查 runner 是否正常运行:

```bash
$ kubectl -n gitlab get pod | grep runner
gitlab-runner-6fb794bb6b-s6n5h                1/1     Running     0          2m17s
```

> 后续想卸载可使用这个命令: `helm -n gitlab uninstall gitlab-runner`

### 检查是否注册成功

进入 Gitlab 【Admin】-【Overview】-【Runners】页面检查 runner 是否注册成功:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220721130051.png)

## 附录
### 测试场景

如果只是测试下 Gitlab，不长期使用，在不需要的时候可以把所有副本缩为 0 以节约成本:

```bash
kubectl get deployments.v1.apps | grep -v NAME | awk '{print $1}' | xargs -I {} kubectl scale deployments.v1.apps/{} --replicas=0
kubectl get sts | grep -v NAME | awk '{print $1}' | xargs -I {} kubectl scale sts/{} --replicas=0
```

在需要用的时候置为 1:

```bash
kubectl get deployments.v1.apps | grep -v NAME | awk '{print $1}' | xargs -I {} kubectl scale deployments.v1.apps/{} --replicas=1
kubectl get sts | grep -v NAME | awk '{print $1}' | xargs -I {} kubectl scale sts/{} --replicas=1
```

如果使用了 `https://github.com/tke-apps/gitlab` 这个仓库，可以直接用以下命令缩0:

```bash
make scale0
```

扩到1:

```bash
make scale1
```