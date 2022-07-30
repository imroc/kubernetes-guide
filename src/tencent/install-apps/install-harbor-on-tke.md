# 自建 Harbor 镜像仓库

## 概述

腾讯云有 [容器镜像服务 TCR](https://cloud.tencent.com/product/tcr)，企业级容器镜像仓库，满足绝大多数镜像仓库的需求，如果需要使用镜像仓库，可以首选 TCR，如果是考虑到成本，或想使用 Harbor 的高级功能(如 [Proxy Cache](https://goharbor.io/docs/2.1.0/administration/configure-proxy-cache/)) 等因素，可以考虑自建 Harbor 镜像仓库，本文介绍如何在腾讯云容器服务中部署 Harbor 作为自建的容器镜像仓库。

## 前提条件

* 已安装 [Helm](https://helm.sh)。
* 已开启集群访问并配置好 kubeconfig，可以通过 kubectl 操作集群(参考[官方文档:连接集群](https://cloud.tencent.com/document/product/457/32191))。

## 操作步骤

### 准备 COS 对象存储

镜像的存储建议是放对象存储，因为容量大，可扩展，成本低，速度还快。腾讯云上的对象存储是 [COS](https://cloud.tencent.com/product/cos)，而 harbor 的存储驱动暂不支持 COS，不过 COS 自身兼容 S3，所以可以配置 harbor 使用 S3 存储驱动。

下面我们登录腾讯云账号，在 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 创建一个存储桶:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718202301.png)

记录一下如下信息后面用:
* `region`: 存储桶所在地域，如 `ap-chengdu`，参考 [地域和可用区](https://cloud.tencent.com/document/product/213/6091)。
* `bucket`: 存储桶名称，如 `registry-12*******6` (有 appid 后缀)。
* `regionendpoint`: 类似 `https://cos.<REGION>.myqcloud.com` 这种格式的 url，如 `https://cos.ap-chengdu.myqcloud.com`。

### 创建云 API 密钥

在 [访问密钥](https://console.cloud.tencent.com/cam/capi) 这里新建密钥:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718203635.png)

> 如果之前已经新建过，可跳过此步骤。

记录一下生成的 `SecretId` 和 `SecretKey`，后面需要用。

### 准备 chart

```bash
helm repo add harbor https://helm.goharbor.io
helm fetch harbor/harbor --untar
```

* 参考 [Harbor 官方文档: Deploying Harbor with High Availability via Helm](https://goharbor.io/docs/edge/install-config/harbor-ha-helm/)
* 查看 `./harbor/values.yaml` 可以看到配置项。

### 准备配置

`harbor-values.yaml`:

```yaml
expose:
  type: clusterIP
  tls:
    enabled: false # 建议关闭 tls，如果对外需要 https 访问，可以将 TLS 放到前面的 7 层代理进行配置。
externalURL: https://registry.imroc.cc # 镜像仓库的对外访问地址
persistence:
  imageChartStorage:
    type: s3
    s3: # 务必修改! COS 相关配置
      region: ap-chegndu
      bucket: harbor-12*******6
      accesskey: AKI*******************************zv # SecretId
      secretkey: g5****************************FR # SecretKey
      regionendpoint: https://cos.ap-chengdu.myqcloud.com
      rootdirectory: / # 存储桶中存储镜像数据的路径
  persistentVolumeClaim:
    registry:
      existingClaim: 'registry-registry'
    jobservice:
      existingClaim: "registry-jobservice"
harborAdminPassword: '123456' # 务必修改! harbor 管理员登录密码
chartmuseum:
  enabled: false
trivy:
  enabled: false
notary:
  enabled: false
database:
  type: external
  external:
    host: 'pgsql-postgresql.db'
    username: 'postgres'
    password: '123456'
    coreDatabase: 'registry'
redis:
  type: external
  external:
    addr: 'redis.db:6379'
    coreDatabaseIndex: "10"
    jobserviceDatabaseIndex: "11"
    registryDatabaseIndex: "12"
    chartmuseumDatabaseIndex: "13"
    trivyAdapterIndex: "14"
```

注意事项:
* `expose` 配置暴露服务，我这里打算用其它方式暴露(istio-ingress-gateway)，不使用 Ingress, LoadBalancer 之类的方式，所以 type 置为 clusterIP (表示仅集群内访问)；另外，tls 也不需要，都是在 gateway 上配置就行。
* `s3` 配置实为 COS 相关配置，将前面步骤记录的信息填上去。
* chartmuseum, trivy, notary 我都不需要，所以 `enabled` 都设为 `false`。
* `harborAdminPassword` 是 harbor 管理员登录密码，设置一下。
* `database` 是配置 postgresql 数据库，我使用现成的数据库，配置 type 为 external 并写上相关连接配置。
* `redis` 是配置 redis 缓存，我使用现成的 redis，配置 type 为 external 并写上相关连接配置。
* `persistentVolumeClaim` 配置持久化存储，我这里只有 `registry` 和 `jobservice` 模块需要挂载存储，存储我挂载的 CFS (腾讯云 NFS 服务)，指定 `existingClaim` 为提前创建好的 pvc，参考附录【挂载 CFS】。

### 安装

```bash
helm upgrade --install -n registry -f harbor-values.yaml registry ./harbor
```

> 后续如需卸载可以执行: helm uninstall registry

检查 pod 是否正常启动:

```bash
$ kubectl -n registry get pod
NAME                                         READY   STATUS    RESTARTS   AGE
registry-harbor-core-55d577c7-l9k5j          1/1     Running   0          1m
registry-harbor-jobservice-66846c575-dbvdz   1/1     Running   0          1m
registry-harbor-nginx-7d94c9446c-z6rkn       1/1     Running   0          1m
registry-harbor-portal-d87bc7554-psp2r       1/1     Running   0          1m
registry-harbor-registry-66d899c9c9-v2w7r    2/2     Running   0          1m
```

检查自动创建的 service:

```bash
$ kubectl -n registry get svc
NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)             AGE
harbor                       ClusterIP   172.16.195.61    <none>        80/TCP              1m
registry-harbor-core         ClusterIP   172.16.244.174   <none>        80/TCP              1m
registry-harbor-jobservice   ClusterIP   172.16.219.62    <none>        80/TCP              1m
registry-harbor-portal       ClusterIP   172.16.216.247   <none>        80/TCP              1m
registry-harbor-registry     ClusterIP   172.16.146.201   <none>        5000/TCP,8080/TCP   1m
```

### 暴露服务

我这里使用 istio-ingressgateway 进行暴露，创建 VirtualService 与 Gateway 绑定:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: registry-imroc-cc
  namespace: registry
spec:
  gateways:
  - external/imroc
  hosts:
  - 'registry.imroc.cc'
  http:
  - route:
    - destination:
        host: harbor
        port:
          number: 80
```

而 Gateway 则是提前创建好的，监听 443，并配置了证书:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: imroc
  namespace: external
spec:
  selector:
    app: istio-ingressgateway
    istio: ingressgateway
  servers:
  - hosts:
    - imroc.cc
    - '*.imroc.cc'
    port:
      name: HTTPS-443
      number: 443
      protocol: HTTPS
    tls:
      credentialName: imroc-cc-crt-secret
      mode: SIMPLE
```

### 验证服务与 COS 最终一致性问题

最后，可以登录一下 registry 并 push 下镜像试试:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718212040.png)

以上直接 push 成功是比较幸运的情况，通常往往会报 500 错误:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718212302.png)

什么原因? 是因为 COS 是保证最终一致性，当镜像数据 put 成功后，并不能保证马上能 list 到，导致 harbor 以为没 put 成功，从而报错，参考 [这篇文章](https://cloud.tencent.com/developer/article/1855894)。

如何解决？可以提工单将指定存储桶改为强一致性。但是由于 COS 底层架构升级的原因，暂时无法后台改配置，预计今年年底后才可以申请，相关工单截图:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718212820.png)

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220718212838.png)

临时规避的方法可以是：上传失败时重试下，直至上传成功。

## 附录

### 挂载 CFS

使用如下 yaml 将 CFS 作为 jobservice 和 registry 模块的持久化存储进行挂载:

`registry-nfs-pv.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: registry-registry
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 10Gi
  nfs:
    path: /registry/registry
    server: 10.10.0.15
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  volumeMode: Filesystem

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-registry
  namespace: registry
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: ""
  volumeMode: Filesystem
  volumeName: registry-registry

```

`jobservice-nfs-pv.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: registry-jobservice
spec:
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 10Gi
  nfs:
    path: /registry/jobservice
    server: 10.10.0.15
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""
  volumeMode: Filesystem

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-jobservice
  namespace: registry
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: ""
  volumeMode: Filesystem
  volumeName: registry-jobservice
```

注意:
* 确保创建的 CFS 与 TKE/EKS 集群在同一个 VPC。
* nfs 的 server ip 在 [CFS 控制台](https://console.cloud.tencent.com/cfs/fs) 可以查看，替换 yaml 中的 ip 地址。
* yaml 中如果指定 path ，确保提前创建好，且 `chmod 0777 <DIR>` 一下，避免因权限问题导致无法启动。