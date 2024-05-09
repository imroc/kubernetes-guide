# 集群与 Git 仓库管理

## 管理方法

推荐每个集群使用一个 Git 仓库来存储该集群所要部署的所有应用的 YAML 与配置。

如果多个集群要部署相同或相似的应用，可抽取成单独的 Git 仓库，作为 submodule 引用进来。

这样做的好处是既可以减少冗余配置，又可以控制爆炸半径。submodule 可能被多个 Git 仓库共享（即多个集群部署相同应用），但如果不执行 `git submodule update --remote` 的话，引用的 commit id 是不会变的，所以也不会因为上游应用更新而使所有使用了该应用的集群一下子全部都更新。

## 添加集群

查看当前有哪些集群：

```bash
argocd cluster list
```

> 默认会有一个 `in-cluster` 集群，代表 `argocd` 所在集群。

添加新集群：

```bash
argocd cluster add mycluster
```

> `mycluster` 是 kubeconfig 中配置的 context 名称，会将此 context 对应的集群添加到 argocd 中，如果希望添加时修改集群名称，可以加 `--name` 来覆盖名称。

## Git 仓库管理

查看当前有哪些 Git 仓库：

```bash
argocd repo list
```

添加 Git 仓库：

```bash
argocd repo add --ssh-private-key-path $HOME/.ssh/id_rsa --insecure-skip-server-verification git@yourgit.com:your-org/your-repo.git
```

> 通常 GitOps 使用的仓库是是由仓库，所以添加仓库时一般用 `--ssh-private-key-path` 指定下 SSH 密钥，以便让 argocd 能够正常拉取到 Git 仓库。
