# 调度相关

## podAntiAffinity 打散调度

<Tabs>
  <TabItem value="1" label="按节点打散">
    <FileBlock file="schedule/pod-anti-affinity-prefer-hostname.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="按节点强制打散">
    <FileBlock file="schedule/pod-anti-affinity-required-hostname.yaml" showLineNumbers />
  </TabItem>
</Tabs>

## topologySpreadConstraints 均匀打散调度

<Tabs>
  <TabItem value="1" label="按节点均匀打散">
    <FileBlock file="schedule/topology-spread-constraints-prefer-hostname.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="按节点强制均匀打散">
    <FileBlock file="schedule/topology-spread-constraints-required-hostname.yaml" showLineNumbers />
  </TabItem>
</Tabs>
