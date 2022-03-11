# 使用 kubectl-aliases 缩短命令

日常使用 kubectl 进行各种操作，每次输入完整命令会比较浪费时间，推荐使用 [kubectl-aliases](https://github.com/ahmetb/kubectl-aliases) 来提升 kubectl 日常操作效率，敲更少的字符完成更多的事。

## 安装 kubectl-aliases

参考 [官方安装文档](https://github.com/ahmetb/kubectl-aliases#installation)

## 查看完整列表

```bash
cat ~/.kubectl_aliases
```

## 高频使用的别名

```bash
ka      // kubectl apply --recursive -f
kg      // kubectl get
kgpo    // kubectl get pods
ksys    // kubectl -n kube-system
ksysgpo // kubectl -n kube-system get pods
kd      // kubectl describe
kdpo    // kubectl describe pod
```

## 自定义

建议针对自己常用的操作设置下别名，比如经常操作 istio 的话，可以用 `ki` 来代替 `kubectl -n istio-system`。

编辑 `~/.kubectl_aliases`:

```bash
alias ki='kubectl -n istio-system'
```
