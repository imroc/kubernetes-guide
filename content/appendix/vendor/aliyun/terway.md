# ACK 的 Terway 网络插件

## 组件部署 YAML

<Tabs>
  <TabItem value="1" label="默认">

  以下 Terway 默认选项（不勾选 `DataPath V2` 和 `NetworkPolicy 支持`）的组件部署 YAML：

  ![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2025%2F09%2F24%2F20250924095942.png)

  <Tabs>
    <TabItem value="1-1" label="terway-eniip">
      <FileBlock file="vendor/aliyun/terway-eniip-daemonset.yaml" showLineNumbers />
    </TabItem>
    <TabItem value="1-2" label="eni-config">
      <FileBlock file="vendor/aliyun/eni-config-configmap.yaml" showLineNumbers />
    </TabItem>
  </Tabs>

  </TabItem>
  <TabItem value="2" label="启用 DataPath V2">
    TODO
  </TabItem>
  <TabItem value="3" label="启用 NetworkPolicy 支持">
    TODO
  </TabItem>
</Tabs>

## CNI 配置

<FileBlock file="vendor/aliyun/10-terway.conflist" showLineNumbers title="/etc/cni/net.d/10-terway.conflist" language="json" />

## 启动参数

```bash
$ kubectl exec -i -t terway-eniip-hntw6 -c terway -- ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 01:41 ?        00:00:00 /usr/bin/terwayd -log-level
```

