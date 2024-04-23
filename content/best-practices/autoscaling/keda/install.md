# 使用 helm 部署 KEDA

## 添加 helm repo

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
```

## 准备 values.yaml

先查看默认的 values.yaml (看看有哪些可以自定义的配置项)

```bash
helm show values kedacore/keda
```

默认的依赖镜像在国内环境拉取不了，可以替换为使用 docker hub 上的 mirror 镜像，配置 `values.yaml`：

```yaml
image:
  keda:
    repository: docker.io/imroc/keda
  metricsApiServer:
    repository: docker.io/imroc/keda-metrics-apiserver
  webhooks:
    repository: docker.io/imroc/keda-admission-webhooks
```

> 以上 mirror 镜像长期自动同步，可放心使用和更新版本。

## 安装

```bash
helm upgrade --install keda kedacore/keda \
  --namespace keda --create-namespace \
  -f values.yaml
```

## 版本与升级

每个 KEDA 的版本都有对应适配的 K8S 版本区间，如果你的 TKE 集群版本不是特别新，安装最新版的 KEDA 可能无法兼容，可查看 [KEDA Kubernetes Compatibility](https://keda.sh/docs/latest/operate/cluster/#kubernetes-compatibility) 来确认当前集群版本能兼容的 KEDA 版本。

比如 TKE 集群版本是 1.26，对应能兼容的 KEDA 最新版本是 v2.12，再查询到 KEDA v2.12 (APP VERSION) 对应的 Chart 版本 (CHART VERSION) 最高版本是 2.12.1：

```bash
$ helm search repo keda --versions
NAME                                            CHART VERSION   APP VERSION     DESCRIPTION
kedacore/keda                                   2.13.2          2.13.1          Event-based autoscaler for workloads on Kubernetes
kedacore/keda                                   2.13.1          2.13.0          Event-based autoscaler for workloads on Kubernetes
kedacore/keda                                   2.13.0          2.13.0          Event-based autoscaler for workloads on Kubernetes
# highlight-next-line
kedacore/keda                                   2.12.1          2.12.1          Event-based autoscaler for workloads on Kubernetes
kedacore/keda                                   2.12.0          2.12.0          Event-based autoscaler for workloads on Kubernetes
kedacore/keda                                   2.11.2          2.11.2          Event-based autoscaler for workloads on Kubernetes
kedacore/keda                                   2.11.1          2.11.1          Event-based autoscaler for workloads on Kubernetes
```

安装 KEDA 时指定版本：

```bash
helm upgrade --install keda kedacore/keda \
  --namespace keda --create-namespace \
  # highlight-next-line
  --version 2.12.1 \
  -f values.yaml
```

后续升级版本时可复用上面的安装命令，只需修改下版本号即可。

**注意**：在升级 TKE 集群前也用这里的方法先确认下升级后的集群版本能否兼容当前版本的 KEDA，如果不能，请提前升级 KEDA 到当前集群版本所能兼容的最新 KEDA 版本。

## 卸载

参考 [官方卸载说明](https://keda.sh/docs/latest/deploy/#uninstall)。

## 参考资料

* [KEDA 官方文档：Deploying KEDA](https://keda.sh/docs/latest/deploy/)
