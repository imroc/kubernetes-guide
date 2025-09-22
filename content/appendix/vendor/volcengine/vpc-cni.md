# VKE 的 VPC-CNI 网络插件
## CNI 配置

<Tabs>
  <TabItem value="1" label="cello">
    <FileBlock file="vendor/volcengine/cello-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cello-config">
    <FileBlock file="vendor/volcengine/cello-config-configmap.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="3" label="cilium-config">
    <FileBlock file="vendor/volcengine/cilium-config-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## CNI 二进制

```bash
root@iv-ye593xiz9c5i3z3kulq3:/opt/cni/bin# ls
cello-cni  cello-meta  cello-rdma  cilium-cni  loopback
```

## 进程

cello 这个 DaemonSet 中包含 `cello` 和 `cilium` 两个容器：
- cello 容器拉起的进程名是 `cello-agent`
- cilium 容器会使用 `cilium-launcher` 拉起 cilium 相关组件，进程树：
  ```bash
  $ pstree -apnT 30278
  cilium-launcher,30278
    └─cilium-agent,30333 --enable-ipv4-masquerade=false --kube-proxy-replacement=strict --node-port-mode=snat --disable-envoy-version-check=true --disable-cnp-status-updates=true --enable-local-node-route=false --datapath-mode=ipvlan --enable-bandwidth-manager=true --agent-health-port=9099 --ipv4-range=169.254.0.0/16 --enable-endpoint-health-checking=false --bpf-map-dynamic-size-ratio=0.0025 --enable-ipv4=true --debug=false --enable-policy=never --ipam=cluster-pool --ipvlan-master-device=eth0 --enable-host-legacy-routing=true --tunnel=disabled --direct-routing-device=eth0 --enable-ipv6=false
        └─cilium-operator-generic,30368 --k8s-namespace kube-system --identity-gc-interval 10m --identity-heartbeat-timeout 20m
  ```

## cilium 版本信息

```bash
root@iv-ye593xiz9ccva4flha5g:/# cilium-operator-generic --version
Cilium-Operator 1.10.4 2a46fd6 2021-09-01T12:58:41-07:00 go version go1.16.7 linux/amd64
root@iv-ye593xiz9ccva4flha5g:/# cilium-agent --version
Cilium 1.10.4 2a46fd6 2021-09-01T12:58:41-07:00 go version go1.16.7 linux/amd64
```

## cilium CRD

安装了以下 cilium 相关 CRD:

```bash
╰─ kubectl get crd | grep cilium
ciliumclusterwidenetworkpolicies.cilium.io                 2025-09-22T04:13:37Z
ciliumegressnatpolicies.cilium.io                          2025-09-22T04:13:36Z
ciliumendpoints.cilium.io                                  2025-09-22T04:13:36Z
ciliumexternalworkloads.cilium.io                          2025-09-22T04:13:36Z
ciliumidentities.cilium.io                                 2025-09-22T04:13:36Z
ciliumlocalredirectpolicies.cilium.io                      2025-09-22T04:13:36Z
ciliumnetworkpolicies.cilium.io                            2025-09-22T04:13:37Z
ciliumnodes.cilium.io                                      2025-09-22T04:13:36Z
```
