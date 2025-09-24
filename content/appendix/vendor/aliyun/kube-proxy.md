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

## 启动参数

<Tabs>
  <TabItem value="1" label="ipvs 模式">

  ```bash
  [root@iZbp16qq4fgg0o7ecm6hm1Z ~]# ps -ef | grep kube-proxy
  root        2712    2345  0 10:11 ?        00:00:00 /usr/local/bin/kube-proxy --config=/var/lib/kube-proxy/config.conf --hostname-override=cn-hangzhou.10.0.0.238
  ```

  </TabItem>
  <TabItem value="2" label="iptables 模式">
  TODO
  </TabItem>
</Tabs>

