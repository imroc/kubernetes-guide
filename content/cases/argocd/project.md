# Git 项目组织方法

## 在根目录创建 ApplicationSet

在 Git 仓库根目录下创建 `argo-apps.yaml` 的文件，定义 `ArgoCD` 的 `ApplicationSet`:

```yaml title="argo-apps.yaml" showLineNumbers
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps-mycluster # ApplicationSet 名称，建议带集群名称后缀
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - git: # 通过当前 Git 仓库的 apps 目录下的子目录自动生成 Application
        repoURL: git@yourgit.com:your-org/your-repo.git 
        revision: HEAD
        directories:
          - path: apps/*
  template:
    metadata:
      name: "{{.path.basename}}-mycluster" # 自动创建的 Application 的名称格式为: 目录名-集群名
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: git@yourgit.com:your-org/your-repo.git
        targetRevision: HEAD
        path: "apps/{{.path.basename}}" # 自动生成的 Application 使用的 YAML 内容在对应子目录下
      destination:
        name: mycluster # Application 被部署的目的集群
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

> 要点解析请看注释内容。

## apps 子目录管理方法

apps 下面的每个子目录中的 YAML，都将作为一个 `Application` 所需的 K8S 资源，可以直接是 K8S YAML，也可以是 `kustomize` 格式的结构。

建议统一采用 `kustomize` 的格式来组织，示例：

```txt
apps
├── jellyfin
│   ├── daemonset.yaml
│   └── kustomization.yaml
└── monitoring
    ├── kustomization.yaml
    ├── namespace.yaml
    ├── values.yaml
    └── vm-hostpath-pv.yaml
```

这样，如果你要添加新的应用，只需要在 apps 下直接新增一个目录就行，不需要再去定义 `Application` 了，会由 `ApplicationSet` 自动生成。

## submodules 管理

多个集群可能会安装相同的应用，而我们采用一个集群的配置对应一个 Git 仓库的管理方法，相同的依赖应用可以提取到单独的 Git 仓库，通过 git 的 submodule 方式引用。

比如多个集群都会安装 EnvoyGateway，将 EnvoyGateway 用单独的 Git 仓库管理，文件结构如下：

```txt
install
├── Makefile
├── install.yaml
└── kustomization.yaml
```

假设对于的 Git 仓库是 `git@yourgit.com:your-org/envoygateway.git`，现将其作为依赖引入到当前 Git 仓库，首先添加 git submodule:

```bash
git submodule add --depth=1 git@yourgit.com:your-org/envoygateway.git submodules/envoygateway
```

然后在 apps 目录下创建 envoygateway 的目录，并创建 `kustomization.yaml`：

```txt
apps
└── envoygateway
    └── kustomization.yaml
```

`kustomization.yaml` 的内容如下：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../submodules/envoygateway/install
```

其它集群的 Git 仓库也一样的操作，这样就实现了多个集群共享同一个应用的 YAML，如果有细微自定义差别，可直接修改 `kustomization.yaml` 进行自定义。如果这个共同依赖的应用需要更新版本，就更新这个 submodules 对应的仓库，然后再更新集群对应仓库的 submodule：

```bash
git submodule update --init --remote
```

> 每个集群对应仓库的 submodule 分开更新，可实现按集群灰度，避免更新出现问题一下子影响所有集群。

前面 `kustomization.yaml` 中引用的 submodule 不在当前目录下的子目录，ArgoCD 使用 kustomize 渲染默认会报错，可配置下 ArgoCD，为 kustomize 指定下 `--load-restrictor=LoadRestrictionsNone` 来允许这种引用。

如果 ArgoCD 本身也是通过 kustomize 部署，可使用 patch 来修改 ConfigMap。

创建 `argocd-cm-patch.yaml`:

```yaml showLineNumbers title="argocd-cm-patch.yaml"
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  # highlight-start
  # argocd 默认会给管理的应用打上 app.kubernetes.io/instance 这个常见注解，
  # 而其它很多开源项目部署的应用也使用了这个注解，会导致冲突，改成其它的注解以避免冲突。
  application.instanceLabelKey: argocd.argoproj.io/instance
  # 让 kustomization.yaml 中能够使用 helmCharts 引用 helm chart，
  # resources 中能够引用本目录之外目录下的内容。
  kustomize.buildOptions: --enable-helm --load-restrictor=LoadRestrictionsNone
  # highlight-end
```

在安装 ArgoCD 的 `kustomization.yaml` 中，将上面的 patch 引用进来：

```yaml showLineNumbers title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

# highlight-start
patches:
  - path: argocd-cm-patch.yaml
# highlight-end

resources:
  - install.yaml
```

