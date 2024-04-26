# 使用 dcgm-exporter 监控 GPU 指标

## 使用 helm 部署 dcgm-exporter

1. 添加 helm 仓库

```bash
helm repo add gpu-helm-charts https://nvidia.github.io/dcgm-exporter/helm-charts
```

2. 创建并根据自己需求配置 `values.yaml`（推荐使用 `values.yaml` 管理自定义配置，方便后续根据需求继续调整配置），默认的 `values.yaml` 可通过 `helm show values gpu-helm-charts/dcgm-exporter` 获取。

3. 使用 helm 安装：

```bash showLineNumbers
helm upgrade --install \
  dcgm-exporter \
  # highlight-next-line
  -f values.yaml \
  gpu-helm-charts/dcgm-exporter
```

## 镜像加速

默认会使用 `nvcr.io/nvidia/k8s/dcgm-exporter` 这个镜像，而 `nvcr.io` 在国内基本会拉取失败，可以更换成其它 mirror 镜像：

* `docker.io/imroc/dcgm-exporter`: 长期自动同步到 dockerhub，如果你的集群里有稳定的 dockerhub 的镜像加速（TKE 环境就自带），那你可以直接更换镜像为这个。
* `nvcr.m.daocloud.io/nvidia/k8s/dcgm-exporter`: `nvcr.m.daocloud.io` 是 DaoCloud 提供的 `nvcr.io` 的的加速地址，免费的，可能不是很稳定。

镜像替换方法很简单，就是在使用 helm 安装的时候指定下参数，如：

```bash showLineNumbers
helm upgrade --install \
  dcgm-exporter \
  gpu-helm-charts/dcgm-exporter \
  # highlight-next-line
  --set image.repository=docker.io/imroc/dcgm-exporter
```

## 常见问题

### 镜像拉取失败

使用 helm 部署 dcgm-exporter，默认会使用 `nvcr.io/nvidia/k8s/dcgm-exporter` 这个镜像，而 `nvcr.io` 在国内基本会拉取失败，可以更换成其它 mirror 镜像：

* `docker.io/imroc/dcgm-exporter`: 长期自动同步到 dockerhub，如果你的集群里有稳定的 dockerhub 的镜像加速（TKE 环境就自带），那你可以直接更换镜像为这个。
* `nvcr.m.daocloud.io/nvidia/k8s/dcgm-exporter`: `nvcr.m.daocloud.io` 是 DaoCloud 提供的 `nvcr.io` 的的加速地址，免费的，可能不是很稳定。

镜像替换方法很简单，下面是 `values.yaml` 示例：

```yaml showLineNumbers title="values.yaml"
image:
  repository: docker.io/imroc/dcgm-exporter
```

### dcgm-exporter 在不支持 GPU 的节点上启动失败

如果集群中部分节点没有 N 卡 GPU，启动 dcgm-exporter 会失败：

```bash
$ kubectl logs dcgm-exporter-kk2k6
2024/04/26 09:16:12 maxprocs: Leaving GOMAXPROCS=2: CPU quota undefined
time="2024-04-26T09:16:13Z" level=info msg="Starting dcgm-exporter"
Error: Failed to initialize NVML
time="2024-04-26T09:16:13Z" level=error msg="Encountered a failure." stacktrace="goroutine 1 [running]:\nruntime/debug.Stack()\n\t/usr/local/go/src/runtime/debug/stack.go:24 +0x5e\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.action.func1.1()\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:269 +0x3d\npanic({0x17dcac0?, 0x28fc390?})\n\t/usr/local/go/src/runtime/panic.go:914 +0x21f\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.initDCGM(0xc0002b2000)\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:509 +0x9b\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.startDCGMExporter(0x47c312?, 0xc000121490)\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:289 +0xb2\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.action.func1()\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:273 +0x5b\ngithub.com/NVIDIA/dcgm-exporter/pkg/stdout.Capture({0x1cbea38?, 0xc0004934a0}, 0xc0000c9b70)\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/stdout/capture.go:77 +0x1f5\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.action(0xc000092600)\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:264 +0x67\ngithub.com/NVIDIA/dcgm-exporter/pkg/cmd.NewApp.func1(0xc00017a000?)\n\t/go/src/github.com/NVIDIA/dcgm-exporter/pkg/cmd/app.go:249 +0x13\ngithub.com/urfave/cli/v2.(*Command).Run(0xc00017a000, 0xc000092600, {0xc000124120, 0x3, 0x3})\n\t/go/pkg/mod/github.com/urfave/cli/v2@v2.27.1/command.go:279 +0x9dd\ngithub.com/urfave/cli/v2.(*App).RunContext(0xc0001bb000, {0x1cbe920?, 0x29c22a0}, {0xc000124120, 0x3, 0x3})\n\t/go/pkg/mod/github.com/urfave/cli/v2@v2.27.1/app.go:337 +0x5db\ngithub.com/urfave/cli/v2.(*App).Run(0xc0000c9f20?, {0xc000124120?, 0x1?, 0x1616830?})\n\t/go/pkg/mod/github.com/urfave/cli/v2@v2.27.1/app.go:311 +0x2f\nmain.main()\n\t/go/src/github.com/NVIDIA/dcgm-exporter/cmd/dcgm-exporter/main.go:35 +0x5f\n"
```

因为节点没有 GPU，启动 dcgm-exporter 也没有意义，启动失败也在情理之中，你可以选择视而不见，不过 k8s 会无限重试，优雅的一点处理方式是给 GPU 节点打 label，然后在安装 dcgm-exporter 的时候指定下调度策略，只让 dcgm-exporter 在有 GPU 的机器上启动，`values.yaml` 配置示例：

```yaml showLineNumbers title="values.yaml"
nodeSelector:
  gpu: nvdia # 假设有 N 卡的节点打上了 gpu=nvdia 的 label
```
