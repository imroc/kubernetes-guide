# 在 Kubernetes 上部署 llama3

## Ollama 与 OpenWebUI 介绍

[Ollama](https://ollama.com/) 是一个运行大模型的工具，可以下载所需的大模型并暴露 API。[OpenWebUI](https://openwebui.com/) 是一个大模型的 Web UI 交互工具，支持 Ollama，即调用 Ollama 暴露的 API 实现与大模型交互。

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F04%2F27%2F20240427085614.png)

## 部署方案选型

`OpenWebUI` 的仓库中自带 `Ollawma` + `OpenWebUI` 的部署方式，主要是 `kustomize` 和 `helm` 这两种方式，参考 [open-webui 仓库的 kubernetes 目录](https://github.com/open-webui/open-webui/tree/main/kubernetes)。

但我更推荐直接写 YAML 进行部署，原因如下：
1. `Ollama` + `OpenWebUI` 所需 YAML 相对较少，直接根据需要写 YAML 更直接和灵活。
2. 不需要研究 `OpenWebUI` 提供的 `kustomize` 和 `helm` 方式的用法。

## 模型选型

Llama3 目前主要有 `8b` 和 `70b` 两个模型，分别对应 80 亿和 700 亿规模的参数模型，CPU 和 GPU 都支持，`8b` 是小模型，对配置要求不高，一般处于成本考虑，可以直接使用 CPU 运行，而 `70b` 则是大模型， CPU 肯定吃不消，GPU 的配置低也几乎跑不起来，主要是显存要大才行，经实测，24G 显存跑起来会非常非常慢，32G 的也比较吃力，40G 的相对流畅（比如 Nvdia A100）。

## 准备 namespace

准备一个 namespace，用于部署运行 llama3 所需的服务，这里使用 `llama` namespace：

```bash
kubectl create ns llama
```

## 部署 ollama

<FileBlock file="llama/ollama.yaml" showLineNumbers title="ollama.yaml" />

## 部署 open-webui

open-webui 是大模型的 web 界面，支持 llama 系列的大模型，通过 API 与 ollama 通信，官方镜像地址是：`ghcr.io/open-webui/open-webui`，在国内拉取速度非常慢，可以替换成 docker hub 里长期自动同步的 mirror 镜像：`docker.io/imroc/open-webui`：

<FileBlock file="llama/open-webui.yaml" showLineNumbers title="webui.yaml" />

## 打开 OpenWebUI

你有很多方式可以将 `OpenWebUI` 暴露给集群外访问，比如 LoadBalancer 类型 Service、Ingress 等，也可以直接用 `kubectl port-forward` 的方式将 webui 暴露到本地：

```bash
kubectl -n llama port-forward service/webui 8080:8080
```

浏览器打开：`http://localhost:8080`，首次打开需要创建账号，第一个创建的账号为管理员账号。

## 下载模型

### 方法一：通过 OpenWebUI 下载

进入 OpenWebUI 并登录后，在 `设置-模型` 里，输出需要下载的 llama3 模型并点击下载按钮（除了基础的模型，还有许多微调的模型，参考 [llama3 可用模型列表](https://ollama.com/library/llama3/tags)）。

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F04%2F27%2F20240427105147.png)

接下来就是等待下载完成：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F04%2F27%2F20240427110023.png)

:::tip[注意]

如果页面关闭，下载会中断，可重新打开页面并重新输入要下载的模型进行下载，会自动断点续传。

:::

### 方法二：执行 ollama pull 下载

进入 ollama 的 pod：

```bash
kubectl -n llama exec -it ollama-0 bash
```

执行 `ollama pull` 下载需要的模型，这里以下载 `70b` 模型为例：

```bash
ollama pull llama3:70b
```

等待下载完成。

:::tip[注意]

如果 kubectl 的连接中断，下载也会中断，可重新执行命令断点续传。

你也可以使用 `nohup ollama pull llama3:70b &` 来下载，通过 `tail -f nohup.out` 查看下载进度，这样可以保证即使 kubectl 中断或退出也会继续下载。

:::

### 方案三：使用 init container 自动下载模型

如果不想每次在新的地方部署需要手动下载模型，可以修改 Ollama 的部署 YAML，加个 `initContainer` 来实现自动下载模型(自动检测所需模型是否存在，不存在才自动下载)：

<Tabs>
  <TabItem value="init-8b" label="initContainer 写法">
    <FileBlock showLineNumbers file="llama/download-llama3-8b.yaml" />
  </TabItem>
  <TabItem value="8b" label="完整配置">
    <FileBlock showLineNumbers file="llama/llama3-cpu-8b.yaml" title="ollama.yaml" />
  </TabItem>
</Tabs>

## 开始对话

打开 OpenWebUI

## 常见问题

### 节点无公网导致模型下载失败

ollama 所在机器需要能够访问公网，因为 ollama 下载模型需要使用公网，否则会下载失败，无法启动，可通过查看 init container 的日志确认：

```bash showLineNumbers
$ kubectl logs -c pull ollama-0
time=2024-04-26T07:29:45.487Z level=INFO source=images.go:817 msg="total blobs: 5"
time=2024-04-26T07:29:45.487Z level=INFO source=images.go:824 msg="total unused blobs removed: 0"
time=2024-04-26T07:29:45.487Z level=INFO source=routes.go:1143 msg="Listening on [::]:11434 (version 0.1.32)"
time=2024-04-26T07:29:45.488Z level=INFO source=payload.go:28 msg="extracting embedded files" dir=/tmp/ollama188207103/runners
time=2024-04-26T07:29:48.896Z level=INFO source=payload.go:41 msg="Dynamic LLM libraries [cuda_v11 rocm_v60002 cpu cpu_avx cpu_avx2]"
time=2024-04-26T07:29:48.896Z level=INFO source=gpu.go:121 msg="Detecting GPU type"
time=2024-04-26T07:29:48.896Z level=INFO source=gpu.go:268 msg="Searching for GPU management library libcudart.so*"
time=2024-04-26T07:29:48.897Z level=INFO source=gpu.go:314 msg="Discovered GPU libraries: [/tmp/ollama188207103/runners/cuda_v11/libcudart.so.11.0]"
time=2024-04-26T07:29:48.910Z level=INFO source=gpu.go:126 msg="Nvidia GPU detected via cudart"
time=2024-04-26T07:29:48.911Z level=INFO source=cpu_common.go:11 msg="CPU has AVX2"
time=2024-04-26T07:29:49.089Z level=INFO source=gpu.go:202 msg="[cudart] CUDART CUDA Compute Capability detected: 6.1"
[GIN] 2024/04/26 - 07:29:50 | 200 |      45.692µs |       127.0.0.1 | HEAD     "/"
[GIN] 2024/04/26 - 07:29:50 | 200 |     378.364µs |       127.0.0.1 | GET      "/api/tags"
downloading model llama3:70b
[GIN] 2024/04/26 - 07:29:50 | 200 |      15.058µs |       127.0.0.1 | HEAD     "/"
pulling manifest ⠏ time=2024-04-26T07:30:20.512Z level=INFO source=images.go:1147 msg="request failed: Get \"https://registry.ollama.ai/v2/library/llama3/manifests/70b\": dial tcp 172.67.182.229:443: i/o timeout"
[GIN] 2024/04/26 - 07:30:20 | 200 | 30.012673354s |       127.0.0.1 | POST     "/api/pull"
pulling manifest
# highlight-next-line
Error: pull model manifest: Get "https://registry.ollama.ai/v2/library/llama3/manifests/70b": dial tcp 172.67.182.229:443: i/o timeout
```

### 70b 模型的速度非常慢

70b 是 700 亿参数的大模型，使用 CPU 运行不太现实，使用 GPU 也得显存足够大，实测用 32G 显存的显卡运行速度也非常慢，建议至少 40G（比如 A100）。

## 参考资料

* Llama3 可用模型列表: https://ollama.com/library/llama3/tags
* Open WebUI: https://docs.openwebui.com/
* Ollama: https://ollama.com/
