## CNI 配置

<Tabs>
  <TabItem value="1" label="cello">
    <FileBlock file="vendor/vke/cello-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cello-config">
    <FileBlock file="vendor/vke/cello-config-configmap.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cilium-config">
    <FileBlock file="vendor/vke/cilium-config-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## CNI 二进制

```bash
root@iv-ye593xiz9c5i3z3kulq3:/opt/cni/bin# ls
cello-cni  cello-meta  cello-rdma  cilium-cni  loopback
```
