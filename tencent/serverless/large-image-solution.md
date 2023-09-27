# 大镜像解决方案

## 背景

超级节点(Serverless) 的 Pod，默认分配的系统盘大小是 20GB，当容器镜像非常大的时候（比如镜像中包含大的 AI 模型)，拉取镜像会因空间不足而失败:

```txt
  Warning  Failed                  50s                  eklet                 Failed to pull image "registry.imroc.cc/test/large:latest": rpc error: code = Unknown desc = failed to pull and unpack image "registry.imroc.cc/test/large:latest": failed to copy: write /var/lib/containerd/io.containerd.content.v1.content/ingest/002e585a6f26fd1a69a59a72588300b909c745455c03e6d99e894d03664d47ce/data: no space left on device
```

针对这种问题，有两种解决方案。

## 方案一: 使用镜像缓存

在 [镜像缓存页面](https://console.cloud.tencent.com/tke2/image-cache/list) 新建实例(确保地域与集群所在地域相同):

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220725202430.png)

填入大镜像的镜像地址，以及系统盘大小:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220725202725.png)

> 如果是私有镜像，也添加下镜像凭证。

等待实例创建完成:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220725205919.png)

最后创建工作负载时，使用 `eks.tke.cloud.tencent.com/use-image-cache: auto` 为 Pod 开启镜像缓存，自动匹配同名镜像的镜像缓存实例，根据快照创建新的磁盘作为 Pod 系统盘，yaml 示例:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: large
spec:
  replicas: 1
  selector:
    matchLabels:
      app: large
  template:
    metadata:
      labels:
        app: large
      annotations:
        eks.tke.cloud.tencent.com/use-image-cache: auto
    spec:
      nodeSelector:
        node.kubernetes.io/instance-type: eklet
      containers:
      - name: large
        image: registry.imroc.cc/test/large:latest
        command:
        - "sleep"
        - "infinity"
        resources:
          requests:
            cpu: '1'
            memory: '2Gi'
          limits:
            cpu: '1'
            memory: '2Gi'
```

如果是通过控制台 UI 创建工作负载，可以直接勾选下镜像缓存:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220725211252.png)

> 通常使用自动匹配即可，更多详情说明参考官方文档 [镜像缓存](https://cloud.tencent.com/document/product/457/65908)。 

工作负载创建好后，从 Pod 事件可以看到类似 ` Image cache imc-al38vsrl used. Disk disk-e8crnrhp attached` 的信息:

```txt
Events:
  Type     Reason               Age   From               Message
  ----     ------               ----  ----               -------
  Normal   Scheduled            79s   default-scheduler  Successfully assigned test/large-77fb4b647f-rpbm9 to eklet-subnet-ahugkjhr-517773
  Normal   Starting             78s   eklet              Starting pod sandbox eks-5epp4l7h
  Normal   Starting             42s   eklet              Sync endpoints
  Normal   ImageCacheUsed       42s   eklet              Image cache imc-al38vsrl used. Disk disk-e8crnrhp attached
  Normal   Pulling              41s   eklet              Pulling image "registry.imroc.cc/test/large:latest"
  Normal   Pulled               40s   eklet              Successfully pulled image "registry.imroc.cc/test/large:latest" in 1.126771639s
  Normal   Created              40s   eklet              Created container large
  Normal   Started              40s   eklet              Started container large
```

进容器内部也可以看到根路径容量不止 20GB 了:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/20220725211450.png)

如果有很多工作负载都使用大镜像，不想每个都配，也可以将注解配置到全局，参考 [EKS 全局配置说明](https://cloud.tencent.com/document/product/457/71915)。

## 方案二: 修改系统盘大小

Pod 系统盘默认大小为 20GB，如有需要，可以改大，超过 20GB 的部分将会进行计费。

修改的方式是在 Pod 上加 `eks.tke.cloud.tencent.com/root-cbs-size: “50”` 这样的注解，示例:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
      annotations:
        eks.tke.cloud.tencent.com/root-cbs-size: "50"
    spec:
      containers:
      - name: nginx
        image: nginx
```

## 总结

针对大镜像的场景，可以使用本文介绍的两种解决方案：镜像缓存和自定义系统盘大小。

使用镜像缓存的优势在于，可以加速大镜像 Pod 的启动；自定义系统盘大小的优势在于，不需要创建镜像缓存实例，比较简单方便。可以根据自身需求选取合适的方案。