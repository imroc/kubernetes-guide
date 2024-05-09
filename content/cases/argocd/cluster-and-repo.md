# 添加集群与 Git 仓库

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
