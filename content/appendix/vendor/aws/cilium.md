# 在 AWS 安装 cilium

## 概述

AWS 并没有对 cilium 做产品化支持，而是 cilium 开源社区支持了 AWS VPC-CNI 插件，在 EKS 环境中安装 cilium 时，自动做一些配置调整来适配 VPC-CNI。

## 安装方法

确保 node 打上如下的污点（可在节点组上配置）：

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

输出：

```txt
🔮 Auto-detected Kubernetes kind: EKS
ℹ  Using Cilium version 1.18.2
🔮 Auto-detected cluster name: roc-test
🔮 Auto-detected kube-proxy has been installed
🔥 Patching the "aws-node" DaemonSet to evict its pods...
```

确认 cilium 相关 Pod 全部 Ready，安装成功：

 ```bash
$ kubectl get pods -l app.kubernetes.io/part-of=cilium
NAME                               READY   STATUS    RESTARTS   AGE
cilium-2qzcl                       1/1     Running   0          2m2s
cilium-c6nb7                       1/1     Running   0          2m2s
cilium-cpcsw                       1/1     Running   0          2m2s
cilium-envoy-9zjnz                 1/1     Running   0          2m2s
cilium-envoy-gwqr5                 1/1     Running   0          2m2s
cilium-envoy-knvjp                 1/1     Running   0          2m2s
cilium-envoy-pmnpt                 1/1     Running   0          2m2s
cilium-operator-69f499bd5d-b72v4   1/1     Running   0          2m1s
cilium-s6jtr                       1/1     Running   0          2m2s
 ```

## YAML 清单

cilium 安装后，相关 YAML 如下：

<Tabs>
  <TabItem value="1" label="cilium">
    <FileBlock file="vendor/aws/cilium-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="cilium-config">
    <FileBlock file="vendor/aws/cilium-config-configmap.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="3" label="cilium-envoy">
    <FileBlock file="vendor/aws/cilium-envoy-daemonset.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="4" label="cilium-envoy-config">
    <FileBlock file="vendor/aws/cilium-envoy-config-configmap.yaml" showLineNumbers />
  </TabItem>
</Tabs>
