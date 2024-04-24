# 在 Kubernetes 上部署 llama3

## 准备 namespace

准备一个 namespace，用于部署运行 llama3 所需的服务，这里使用 `llama` namespace：

```bash
kubectl create ns llama
```

## 部署 ollama

```yaml showLineNumbers
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ollama
  namespace: llama
spec:
  serviceName: "ollama"
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      initContainers:
        - name: pull
          image: ollama/ollama:latest
          tty: true
          stdin: true
          command:
            - bash
            - -c
            - |
              # highlight-next-line
              model="llama3:8b" # 替换需要使用的模型，模型库列表: https://ollama.com/library/llama3
              ollama serve &
              sleep 5 # 等待 ollama server 就绪，就绪后才能执行 ollama cli 工具的命令
              result=`ollama list | grep $model`
              if [ "$result" == "" ]; then
                echo "downloading model $model"
                ollama pull $model
              else
                echo "model $model already been downloaded"
              fi
          volumeMounts:
            - name: ollama-volume
              mountPath: /root/.ollama
      containers:
        - name: ollama
          image: ollama/ollama:latest
          ports:
            - containerPort: 11434
          resources:
            requests:
              cpu: "2000m"
              memory: "2Gi"
            limits:
              cpu: "4000m"
              memory: "4Gi"
              # highlight-next-line
              nvidia.com/gpu: "0" # 如果要用 Nvidia GPU，这里声明下 GPU 卡
          volumeMounts:
            - name: ollama-volume
              mountPath: /root/.ollama
          tty: true
  volumeClaimTemplates:
    - metadata:
        name: ollama-volume
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            # highlight-next-line
            storage: 50Gi # 注意要确保磁盘容量能够容纳得下模型的体积
---
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: llama
  labels:
    app: ollama
spec:
  type: ClusterIP
  ports:
    - port: 11434
      protocol: TCP
      targetPort: 11434
  selector:
    app: ollama
```

## 部署 open-webui

open-webui 是大模型的 web 界面，支持 llama 系列的大模型，通过 API 与 ollama 通信，官方镜像地址是：`ghcr.io/open-webui/open-webui`，在国内拉取速度非常慢，可以替换成 docker hub 里长期自动同步的 mirror 镜像：`docker.io/imroc/open-webui`：

```yaml showLineNumbers
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: webui-pvc
  namespace: llama
  labels:
    app: webui
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 2Gi

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webui
  namespace: llama
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webui
  template:
    metadata:
      labels:
        app: webui
    spec:
      containers:
        - name: webui
          # highlight-next-line
          image: imroc/open-webui:main # docker hub 中的 mirror 镜像，长期自动同步，可放心使用
          env:
            - name: OLLAMA_BASE_URL
              # highlight-next-line
              value: http://ollama:11434 # ollama 的地址
          tty: true
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "500m"
              memory: "500Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          volumeMounts:
            - name: webui-volume
              mountPath: /app/backend/data
      volumes:
        - name: webui-volume
          persistentVolumeClaim:
            claimName: webui-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: webui
  namespace: llama
  labels:
    app: webui
spec:
  type: ClusterIP
  ports:
    - port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    app: webui
```

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
