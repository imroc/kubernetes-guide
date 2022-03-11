# Kubernetes 实践指南

[序言](README.md)

# 集群网络

- [常见问题](networking/faq/README.md)
  - [为什么要开 bridge-nf-call-iptables?](networking/faq/why-enable-bridge-nf-call-iptables.md)

# 实用技能

- [高效使用 kubectl](skill/kubectl/README.md)
  - [使用 kubectl-aliases 缩短命令](skill/kubectl/kubectl-aliases.md)
  - [使用 kubectx 和 kubens 快速切换](skill/kubectl/kubectx.md)
  - [使用 kubecm 合并 kubeconfig](skill/kubectl/kubecm.md)
- [网络抓包](skill/network/README.md)
  - [使用 nsenter 进入 netns 抓包](skill/network/nsenter.md)
  - [使用 ksniff 远程抓包](skill/network/ksniff.md)
- [使用 cfssl 生成证书](skill/cfssl.md)

# 服务部署最佳实践

- [Pod 优雅终止](deploy/graceful-shutdown/README.md)
  - [为什么收不到 SIGTERM 信号?](deploy/graceful-shutdown/why-cannot-receive-sigterm.md)
  - [如何在 SHELL 中传递信号](deploy/graceful-shutdown/propagating-signals-in-shell.md)
  - [处理 SIGTERM 代码示例](deploy/graceful-shutdown/code-example-of-handle-sigterm.md)
