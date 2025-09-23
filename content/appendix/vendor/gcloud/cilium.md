# Cilium 对 GKE 的支持

## 概述

GKE 标准集群默认网络模式并没有对 cilium 做产品化支持，不过 cilium 开源社区支持了 GKE 标准集群的容器网络，在 GKE 环境中安装 cilium 时，自动做一些配置调整来适配。

## 安装方法

确保 node 打上如下的污点：

```yaml
  taints:
   - key: "node.cilium.io/agent-not-ready"
     value: "true"
     effect: "NoExecute"
```

然后用 cli 工具安装 cilium:

```bash
cilium install --version 1.18.2
```

## YAML 清单

cilium 安装后，相关 YAML 如下：

<Tabs>
  <TabItem value="1" label="cilium">
    <FileBlock file="vendor/gcloud/cilium.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cilium-config">
    <FileBlock file="vendor/gcloud/cilium-config.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="3" label="cilium-operator">
    <FileBlock file="vendor/gcloud/cilium-operator.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="4" label="cilium-envoy">
    <FileBlock file="vendor/gcloud/cilium-envoy.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="5" label="cilium-envoy-config">
    <FileBlock file="vendor/gcloud/cilium-envoy-config.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## CNI 配置

cilium 安装后，CNI 配置变成：

<FileBlock file="vendor/gcloud/05-cilium.conflist" showLineNumbers title="/etc/cni/net.d/05-cilium.conflist" language="json" />

## cilium-dbg

```bash
$ kubectl exec -i -t cilium-69x5v -- bash
root@gke-gke-test-default-pool-e5de334e-9jms:/home/cilium# cilium-dbg status
KVStore:                 Disabled
Kubernetes:              Ok         1.34 (v1.34.0-gke.1662000) [linux/amd64]
Kubernetes APIs:         ["EndpointSliceOrEndpoint", "cilium/v2::CiliumCIDRGroup", "cilium/v2::CiliumClusterwideNetworkPolicy", "cilium/v2::CiliumEndpoint", "cilium/v2::CiliumNetworkPolicy", "cilium/v2::CiliumNode", "core/v1::Pods", "networking.k8s.io/v1::NetworkPolicy"]
KubeProxyReplacement:    False
Host firewall:           Disabled
SRv6:                    Disabled
CNI Chaining:            none
CNI Config file:         successfully wrote CNI configuration file to /host/etc/cni/net.d/05-cilium.conflist
Cilium:                  Ok   1.18.2 (v1.18.2-5bd307a8)
NodeMonitor:             Listening for events on 2 CPUs with 64x4096 of shared memory
Cilium health daemon:    Ok
IPAM:                    IPv4: 11/254 allocated from 10.44.0.0/24,
IPv4 BIG TCP:            Disabled
IPv6 BIG TCP:            Disabled
BandwidthManager:        Disabled
Routing:                 Network: Native   Host: Legacy
Attach Mode:             TCX
Device Mode:             veth
Masquerading:            IPTables [IPv4: Enabled, IPv6: Disabled]
Controller Status:       62/62 healthy
Proxy Status:            OK, ip 10.44.0.205, 0 redirects active on ports 10000-20000, Envoy: external
Global Identity Range:   min 256, max 65535
Hubble:                  Ok              Current/Max Flows: 4095/4095 (100.00%), Flows/s: 14.39   Metrics: Disabled
Encryption:              Disabled
Cluster health:          3/3 reachable   (2025-09-23T07:47:31Z)   (Probe interval: 1m56.754608943s)
Name                     IP              Node                     Endpoints
Modules Health:          Stopped(13) Degraded(0) OK(88)
```
