# ACK 的 kube-proxy

## 组件部署 YAML

<Tabs>
  <TabItem value="1" label="ipvs 模式">

  <Tabs>
    <TabItem value="1-1" label="daemonset">
      <FileBlock file="vendor/aliyun/kube-proxy-daemonset-ipvs.yaml" showLineNumbers />
    </TabItem>
    <TabItem value="1-2" label="configmap">
      <FileBlock file="vendor/aliyun/kube-proxy-configmap-ipvs.yaml" showLineNumbers />
    </TabItem>
  </Tabs>

  </TabItem>
  <TabItem value="2" label="iptables 模式">
    TODO
  </TabItem>
</Tabs>
