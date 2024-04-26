# 在 Kubernetes 上部署 llama3

## 准备 namespace

准备一个 namespace，用于部署运行 llama3 所需的服务，这里使用 `llama` namespace：

```bash
kubectl create ns llama
```

## 部署 ollama

<FileBlock file="llama/llama3-cpu-8b.yaml" showLineNumbers />

## 部署 open-webui

open-webui 是大模型的 web 界面，支持 llama 系列的大模型，通过 API 与 ollama 通信，官方镜像地址是：`ghcr.io/open-webui/open-webui`，在国内拉取速度非常慢，可以替换成 docker hub 里长期自动同步的 mirror 镜像：`docker.io/imroc/open-webui`：

<FileBlock file="llama/open-webui.yaml" showLineNumbers />

## 打开 webui

你有很多方式可以将 open-webui 暴露给集群外访问，比如 LoadBalancer 类型 Service、Ingress 等，也可以直接用 `kubectl port-forward` 的方式将 webui 暴露到本地：

```bash
kubectl -n llama port-forward service/webui 8080:8080
```

浏览器打开：`http://localhost:8080`，创建账号然后进入 web 界面，选择 llama3 的模型，然后开启对话。

## 参考资料

* Llama3 模型库：https://ollama.com/library/llama3
* Open WebUI: https://docs.openwebui.com/
* Ollama: https://ollama.com/
