# 在 Kubernetes 上部署 llama3

## 部署方案选型

OpenWebUI 的仓库中自带 Ollama + OpenWebUI 的部署方式，主要是 kustomize 和 helm 这两种方式，参考 [open-webui 仓库的 kubernetes 目录](https://github.com/open-webui/open-webui/tree/main/kubernetes)。

但我更推荐直接写 YAML 进行部署，原因如下：
1. Ollama + OpenWebUI 所需 YAML 相对较少，直接根据需要写 YAML 更直接和灵活。
2. 不需要研究 OpenWebUI 提供的 kustomize 和 helm 方式的用法。

## 准备 namespace

准备一个 namespace，用于部署运行 llama3 所需的服务，这里使用 `llama` namespace：

```bash
kubectl create ns llama
```

## 部署 ollama

<FileBlock file="llama/llama3-cpu-8b.yaml" showLineNumbers title="ollama.yaml" />

## 部署 open-webui

open-webui 是大模型的 web 界面，支持 llama 系列的大模型，通过 API 与 ollama 通信，官方镜像地址是：`ghcr.io/open-webui/open-webui`，在国内拉取速度非常慢，可以替换成 docker hub 里长期自动同步的 mirror 镜像：`docker.io/imroc/open-webui`：

<FileBlock file="llama/open-webui.yaml" showLineNumbers title="webui.yaml" />

## 打开 webui

你有很多方式可以将 open-webui 暴露给集群外访问，比如 LoadBalancer 类型 Service、Ingress 等，也可以直接用 `kubectl port-forward` 的方式将 webui 暴露到本地：

```bash
kubectl -n llama port-forward service/webui 8080:8080
```

浏览器打开：`http://localhost:8080`，创建账号然后进入 web 界面，选择 llama3 的模型，然后开启对话。

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

### 70b 的速度非常慢

70b 是 700 亿参数的大模型，使用 CPU 运行不太现实，使用 GPU 也得显存足够大，实测用 32G 显存的显卡运行速度也非常慢，建议至少 40G（比如 A100）。

## 参考资料

* Llama3 模型库：https://ollama.com/library/llama3
* Open WebUI: https://docs.openwebui.com/
* Ollama: https://ollama.com/
