# Kubernetes 实践指南

[序言](README.md)

# 集群网络

- [CoreDNS](networking/coredns/README.md)
  - [自定义域名解析](networking/coredns/customize-resolution.md)
  - [性能优化](networking/coredns/optimization.md)

- [常见问题](networking/faq/README.md)
  - [为什么要开 bridge-nf-call-iptables?](networking/faq/why-enable-bridge-nf-call-iptables.md)
  - [ipvs 连接复用引发的系列问题](networking/faq/ipvs-conn-reuse-mode.md)

# 实用技能

- [高效使用 kubectl](skill/kubectl/README.md)
  - [使用 kubectl-aliases 缩短命令](skill/kubectl/kubectl-aliases.md)
  - [使用 kubectx 和 kubens 快速切换](skill/kubectl/kubectx.md)
  - [使用 kubecm 合并 kubeconfig](skill/kubectl/kubecm.md)
- [网络抓包](skill/network/README.md)
  - [使用 nsenter 进入 netns 抓包](skill/network/nsenter.md)
  - [使用 ksniff 远程抓包](skill/network/ksniff.md)
- [使用 cfssl 生成证书](skill/cfssl.md)
- [使用 cert-manager 签发免费证书](skill/sign-free-certs-with-cert-manager.md)

# 服务部署

- [优雅终止最佳实践](deploy/graceful-shutdown/README.md)
  - [为什么收不到 SIGTERM 信号?](deploy/graceful-shutdown/why-cannot-receive-sigterm.md)
  - [如何在 SHELL 中传递信号](deploy/graceful-shutdown/propagating-signals-in-shell.md)
  - [处理 SIGTERM 代码示例](deploy/graceful-shutdown/code-example-of-handle-sigterm.md)
- [健康检查配置最佳实践](deploy/healthcheck.md)
- [为 Pod 设置内核参数](deploy/set-sysctl.md)
  
# 容器化

- [在容器内使用 systemd](containerization/systemd.md)
