# Kubernetes 实践指南

[序言](README.md)

# 集群网络

- [CoreDNS](networking/coredns/README.md)
  - [自定义域名解析](networking/coredns/customize-coredns-resolution.md)
  - [性能优化](networking/coredns/optimize-coredns-performance.md)

- [常见问题](networking/faq/README.md)
  - [为什么要开 bridge-nf-call-iptables?](networking/faq/why-enable-bridge-nf-call-iptables.md)
  - [ipvs 连接复用引发的系列问题](networking/faq/ipvs-conn-reuse-mode.md)

# 实用技巧

- [高效使用 kubectl](trick/kubectl/README.md)
  - [使用 kubectl-aliases 缩短命令](trick/kubectl/kubectl-aliases.md)
  - [使用 kubectx 和 kubens 快速切换](trick/kubectl/quick-switch-with-kubectx.md)
  - [使用 kubecm 合并 kubeconfig](trick/kubectl/merge-kubeconfig-with-kubecm.md)
- [证书相关](trick/certs/README.md)
  - [使用 cfssl 生成证书](trick/certs/sign-certs-with-cfssl.md)
  - [使用 cert-manager 签发免费证书](trick/certs/sign-free-certs-with-cert-manager.md)
  - [为 dnspod 的域名签发免费证书](trick/certs/sign-free-certs-for-dnspod.md)
- [用户与权限](trick/user-and-permissions/README.md)
  - [使用 CSR API 创建用户](trick/user-and-permissions/create-user-using-csr-api.md)

# 部署与配置

- [优雅终止最佳实践](deploy/graceful-shutdown/README.md)
  - [Pod 销毁流程](deploy/graceful-shutdown/pod-termination-proccess.md)
  - [业务代码处理 SIGTERM 信号](deploy/graceful-shutdown/code-example-of-handle-sigterm.md)
  - [为什么收不到 SIGTERM 信号?](deploy/graceful-shutdown/why-cannot-receive-sigterm.md)
  - [在 SHELL 中传递信号](deploy/graceful-shutdown/propagating-signals-in-shell.md)
  - [合理使用 preStop](deploy/graceful-shutdown/use-prestop.md)
  - [长连接场景](deploy/graceful-shutdown/persistent-connection.md)
  - [LB 直通 Pod 场景](deploy/graceful-shutdown/lb-to-pod-directly.md)
- [健康检查配置最佳实践](deploy/configure-healthcheck.md)
- [为 Pod 设置内核参数](deploy/set-sysctl.md)
- [性能优化](deploy/performance-optimization/README.md)
  - [Pod 绑定 NUMA 亲和性](deploy/performance-optimization/single-numa-node.md)
- [高可用部署](deploy/ha/README.md)
  - [Pod 打散调度](deploy/ha/pod-split-up-scheduling.md)
  - [安全维护或下线节点](deploy/ha/securely-maintain-or-offline-node.md)
  - [工作负载平滑升级](deploy/ha/smooth-upgrade.md)
- [弹性伸缩](deploy/autoscaling/README.md)
  - [调节 HPA 扩缩容灵敏度](deploy/autoscaling/hpa-velocity.md)
  - [HPA 使用自定义指标进行伸缩](deploy/autoscaling/hpa-with-custom-metrics.md)
  
# 容器化

- [在容器内使用 systemd](containerization/systemd-in-container.md)
- [Java 容器化](containerization/java-container.md)

# 故障排查

- [排障技能](troubleshooting/skill/README.md)
  - [使用 nsenter 进入 netns 抓包](troubleshooting/skill/network/enter-netns-with-nsenter.md)
  - [使用 ksniff 远程抓包](troubleshooting/skill/network/remote-capture-with-ksniff.md)
  - [使用 Systemtap 定位疑难杂症](troubleshooting/skill/kernel/use-systemtap-to-locate-problems.md)
- [Pod 排障](troubleshooting/pod/README.md)
  - [Pod 一直 Terminating](troubleshooting/pod/pod-terminating.md)
    - [排查 device or resource busy](troubleshooting/pod/device-or-resource-busy.md)
  - [分析 Pod 重启原因](troubleshooting/pod/pod-restart.md)
- [节点排障](troubleshooting/node/README.md)
  - [节点 Crash 与 Vmcore 分析](troubleshooting/node/node-crash-and-vmcore.md)
  - [节点高负载](troubleshooting/node/node-high-load.md)
    - [IO 高负载](troubleshooting/node/io-high-load.md)
  - [内存碎片化](troubleshooting/node/memory-fragmentation.md)
  - [ARP 缓存爆满](troubleshooting/node/arp-cache-overflow.md)
- [网络排障](troubleshooting/network/README.md)
  - [超时排查思路](troubleshooting/network/timeout.md)
  - [丢包排查思路](troubleshooting/network/drop-packets.md)
  - [CLOSE_WAIT 堆积](troubleshooting/network/close-wait-stacking.md)
- [排障案例](troubleshooting/cases/README.md)
  - [网络故障](troubleshooting/cases/network/README.md)
    - [DNS 5 秒延时](troubleshooting/cases/network/dns-lookup-5s-delay.md)
