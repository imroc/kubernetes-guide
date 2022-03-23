# 高可用部署

要实现在 Kubernetes 上对业务进行高可用部署，可以从以下几方面做优化:
1. [Pod 打散调度](pod-split-up-scheduling.md) 以实现容灾，避免单点故障。
2. [工作负载平滑升级](smooth-upgrade.md)，让业务发版对业务无损，甚至无需值守。
3. 合理配置健康检查，参考 [健康检查配置最佳实践](../configure-healthcheck.md)。
4. 最后，[安全维护或下线节点](../ops/securely-maintain-or-offline-node.md)，避免节点驱逐时影响业务稳定性。
