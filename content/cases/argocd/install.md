# 安装

## 安装 ArgoCD

推荐下面两种安装方式。

### 使用 kubectl 一键安装

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 使用 kustomize 安装

准备一个目录：

```bash
mkdir argocd
cd argocd
```

下载 argocd 部署 YAML：

```bash
wget -O install.yaml https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

> 后续升级 argocd 时，可以用上面相同命令更新下 YAML 文件。

创建 `kustomization.yaml`:

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd
resources:
- install.yaml
```

:::tip

`resources` 里也可以直接引用 YAML 的 URL 下载地址，但不推荐，因为将 YAML 下到本地一方面可以避免因网络环境问题导致在某些环境部署失败，另一方面也方便后续升级时对比前后差异。

:::

安装：

```bash
kubectl create namespace argocd
kubectl apply -k .
```

## 安装 argocd 命令行工具

如果有 `homebrew`，可以一键安装：

```bash
brew install argocd
```

也可以从 release 页面下载安装二进制: https://github.com/argoproj/argo-cd/releases

## 暴露 ArgoCD API Server

`argocd` 命令行工具是与 `argocd-server` 通信来实现交互的，所以需要让 `argocd` 命令行工具访问到 `argocd-server` 暴露的端口，有以下几种方式。

### 使用 LoadBalancer Service 暴露

如果你的集群环境有 LoadBalancer Service 的实现，可以直接将 `argocd-server` 的 service 类型改成 `LoadBalancer`:

```bash
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}''
```

不过还是不建议直接用 kubectl 改，遵循 GitOps 理念，任何改动都应变成声明式的文件，如果用 `kustomize` 部署，可以像下面一样加下 patch：

```yaml showLineNumbers title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argocd
resources:
  - install.yaml

patches:
  # highlight-start
  - target:
      name: argocd-server
      kind: Service
    patch: |
      - path: "/spec/type"
        op: add
        value: "LoadBalancer"
  # highlight-end
```

### 使用 Ingress 或 Gateway API 暴露

如果你的集群有 Ingress 或 Gateway API 的实现，可以定义 Ingress 或 Gateway API 的资源来暴露 `argocd-server`。

### 使用 kubectl port-forward

通常我们并不想将 `argocd-server` 暴露给其它人用，可以使用 `kubectl port-forward` 将 `argocd-server` 的端口转发到本机端口：

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

:::tip

此时 `argocd-server` 的访问地址是 `127.0.0.1:8080`

::::

## 登录

argocd 安装时会自动生成 `admin` 的初始密码，确保 kubeconfig 的当前 context 指向的是 argocd 所在集群，使用以下命令获取初始密码:

```bash
argocd admin initial-password -n argocd
```

然后使用初始密码登录：

```bash
argocd login 127.0.0.1:8080
```

> 注意修改 `argocd-server` 地址，这里假设用 `kubectl port-forward` 暴露的 argocd-server。

登录后建议修改下密码：

```bash
argocd account update-password
```

## 参考资料

* ArgoCD Installation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
* ArgoCD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started
