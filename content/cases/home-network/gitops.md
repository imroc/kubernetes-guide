# 使用 GitOps 方式管理配置

## 配置管理问题

在前面的章节中，我们将每个应用的配置都单独放到一个目录，并使用 kustomize 的方式组织目录结构。当需要对配置进行改动时，修改相应的配置文件后需重新 apply 一下，操作起来相对繁琐，另外还存在一个难题：这些配置存放在哪，以谁的为准？如果放到路由器内，每次修改配置需要先 SSH 登录路由器进行修改并重新 apply；如果存放到自己电脑，每次修改配置都要指定用这台电脑进行修改；如果在多个设备都有保存配置，那还需要保证每个设备的配置保持同步，否则容易导致配置错乱。

## GitOps 管理方案

为了解决前面提到的配置管理问题，我们可以采用 `GitOps` 的理念，将路由器里所有应用的配置，放到一个 Git 仓库中，然后 `GitOps` 工具会对比集群中的配置与 Git 仓库中声明的配置，确保集群中的配置始终符合 Git 仓库中的配置。

当要修改配置时，直接将修改提交到 Git 仓库即可，`GitOps` 工具会自动拉取 Git 仓库并进行调谐，将改动 apply 到集群中。

## Argo CD 介绍

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) 是 Kubernetes 生态中流行的 `GitOps` 工具，支持 `kustomize`、`helm`、`jsonnet` 以及 `YAML` 和 `JSON` 方式定义 kubernetes manifests。本文将介绍如何利用 Argo CD 来管理云原生家庭网络的配置。

## 创建 Git 仓库

通常我们需要将配置存放到私有的 Git 仓库中，在国内你可以使用 [gitee](https://gitee.com/) 来托管私有仓库，国内速度快，而且免费。

## 项目结构组织

前面我们已经将所有应用配置都用单独的目录保存，并采用 `kustomize` 方式组织结构，现在我们将其放到 Git 仓库目录下 `apps` 的子目录下：

```txt
apps
├── alist
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── aria2
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── ddns
│   ├── config
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── dnsmasq
│   ├── config
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── filebrowser
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── home-assistant
│   ├── daemonset.yaml
│   └── kustomization.yaml
├── homepage
│   ├── config
│   ├── daemonset.yaml
│   └── kustomization.yaml
```

将所有配置提交并 push 到 Git 仓库。

## 安装 Argo CD

Argo CD 可以安装在路由器，也可以安装在其它地方。由于我有自己的 linux 开发机，并且也装了 k3s，而且家里路由器也部署了 DDNS 服务，电信宽带也支持独占公网 IP，从外部可以远程连上家里路由器的 k3s 集群，所以我将 Argo CD 安装在自己的开发机，由开发机远程管理多个 k8s 集群，其中就包括家里路由器的 k3s 集群。

具体 Argo CD 的安装方法可参考官方文档: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/

## Argo CD 添加集群与 Git 仓库

安装完 Argo CD 并配置好 `argocd` 命令后，我们来使用 `argocd` 命令添加下集群和 Git 仓库。

如果你的 Argo CD 就安装在路由器的 k3s 集群中，那么无需添加集群，会自动添加一个名为 `in-cluster` 的集群，代表本集群，后续可通过 `in-cluster` 来引用。如果你像我一样将 Argo CD 部署在外部的集群中，先确保你的 kubeconfig 当前的 context 能从外部操作家里的 k3s 集群，然后使用如下命令将集群添加到 Argo CD 中：

```bash
argocd cluster add home
```

> home 改为 context 名称，也将作为后续在 Argo CD 引用的集群名称。

下面来添加 Git 仓库到 Argo CD 中：

```bash
argocd repo add --ssh-private-key-path $HOME/.ssh/id_rsa --insecure-skip-server-verification git@gitee.com:your-name/your-repo.git
```

要点解析：
* 添加私有仓库指定 SSH 密钥，以便让 Argo CD 有权限拉取 Git 仓库。
* 替换 Git 仓库地址为你自己仓库的地址。

## 创建 ApplicationSet

`ApplicationSet` 是 Argo CD 支持的 CRD 资源，相当于是应用模版，会根据 `ApplicationSet` 所声明的配置自动创建 `Application`，每个 `Application` 就是 Argo CD 所管理的一个应用：

在 Argo CD 所在集群创建类似如下的 `ApplicationSet`:

```yaml showLineNumbers title="argo-apps.yaml"
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps-home-router
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - git:
        repoURL: git@gitee.com:your-name/your-repo.git
        revision: HEAD
        directories:
          - path: apps/*
  template:
    metadata:
      name: "{{.path.basename}}-home-router"
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: git@gitee.com:your-name/your-repo.git
        targetRevision: HEAD
        path: "apps/{{.path.basename}}"
      destination:
        name: home
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

要点解析：
* `repoURL` 替换为我们前面添加的 Git 仓库地址。
* `directories` 的 `path` 定义为 `apps/*`，表示会自动扫描 Git 仓库 `apps` 目录下的子目录，然后在 `template` 下的 `source.path` 通过 `{{.path.basename}}` 引用子目录的名称，表示为每个子目录生成一个 `Application`，Argo CD 会自动识别到子目录下通过 `kustomize` 方式组织的配置，会自动用 kustomize 渲染出 YAML 并 apply 到集群。
* `destination.name` 替换为集群名称，如果 Argo CD 部署在当前路由器，就固定是 `in-cluster`。
* `syncPolicy.automated.prune` 置为 true，表示配置变更时，会对比 Git 前后差异，如果是变更后某些资源删除了，Argo CD 也会将其从集群中删除该资源，即完全以 Git 仓库中声明的为准，拒绝多余的资源。

创建好后，可以通过 `argocd appset list` 查看已创建的 `ApplicationSet`，通过 `argocd app list` 查看通过 `ApplicationSet` 自动创建的 `Application` 列表，也可以通过登录 Argo CD 的后台管理网页进行查看和手动触发同步。

## 提交 Git 改动

当 `Application` 都被自动创建出来后，可以尝试提交一些修改到 Git 仓库，等待一会儿的时间，验证下修改是否被同步到了集群中。

验证成功后，后续有任何修改，都可以直接提交到 Git 仓库，无论在哪个设备都一样，完全以 Git 仓库中的内容为准。

## 小技巧：一键自动提交改动

如果觉得每次修改都要 commit 和 push 这样的操作太麻烦，可以写一个 shell 函数：

```bash
gg () {
        git add -A
        msg="update at $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "${1:-$msg}"
        git push
}
```

将此函数放到里所使用的 shell 的 rc 文件里，这样每次在 shell 里执行 `gg` 就是调用此函数实现一键自动 commit 并 push 所有改动到 Git 仓库，让改动变得非常方便。

## 参考资料

* ArgoCD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
* ArgoCD Installation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
* Introduction to ApplicationSet controller: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
