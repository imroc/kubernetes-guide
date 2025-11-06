# 使用 kubectx 和 kubens 快速切换

推荐使用 `kubectx` 和 `kubens` 来在多个集群和命名空间之间快速切换。

## 项目地址

这两个工具都在同一个项目中: [https://github.com/ahmetb/kubectx](https://github.com/ahmetb/kubectx)

## 安装

参考 [官方安装文档](https://github.com/ahmetb/kubectx#installation)。

推荐使用 kubectl 插件的方式安装:

```bash
kubectl krew install ctx
kubectl krew install ns
```

> 如果没安装 [krew](https://krew.sigs.k8s.io/)，需提前安装下，参考 [krew 安装文档](https://krew.sigs.k8s.io/docs/user-guide/setup/install/)。

## 使用

插件方式安装后，使用如下命令切换集群:

```bash
kubectl ctx [CLUSTER]
```

切换命名空间:

```bash
kubectl ns [NAMESPACE]
```

推荐结合 [使用 kubectl 别名快速执行命令](./kubectl-aliases.md) 来缩短命令:

```bash
k ctx [CLUSTER]
k ns [NAMESPACE]
```