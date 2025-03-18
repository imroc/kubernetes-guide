# Webhook 开发

## 概述

K8S 有 MutatingWebhook 和 ValidatingWebhook 两种类型的 Webhook，分别用于修改 Pod 的 Spec 和验证 Pod 的 Spec，本文教你如何用 kubebuilder 快速开发 Webhook。

## 快速创建 MutatingWebhook 和 ValidatingWebhook 脚手架代码

使用 kubebuilder 创建 Webhook 脚手架代码用 `kubebuilder create webhook`，`--defaulting` 和 `--programmatic-validation`  参数分别表示 MutatingWebhook 和 ValidatingWebhook。

假如同时创建两种 Webhook，示例命令如下：

```bash
kubebuilder create webhook --group networking --version v1alpha1 --kind CLBPortPool --defaulting --programmatic-validation
```

## 创建 K8S 内置资源的 Webhook

有时候我们希望对 K8S 内置的资源进行一些校验和修改，比如为 Pod 支持一些自定义的注解，如果有设置相应注解就自动校验并创建本项目的 CRD 资源与 Pod 进行关联，再由本项目中的 controller 进行调谐。

如何实现呢？以给 Pod 添加 ValidatingWebhook 和 MutatingWebhook 为例，添加 Pod API 到项目但不创建 CRD 和控制器：

```bash
kubebuilder create api --group core --kind Pod --version v1 --controller=false --resource=false
```

然后再创建 Webhook：

```bash
kubebuilder create webhook --group core --version v1 --kind Pod --defaulting --programmatic-validation
```

最后再修改下初始化 manager 的代码，让它调用 `SetupPodWebhookWithManager`。


## Webhook 只对部分资源生效

假如为 Pod 创建了 Webhook，但希望只针对带有特定注解或 label 的 Pod 生效，此时可以配置下匹配条件，避免对所有 Pod 生效。

:::info[注意]

如果 pod webhook 没配置匹配条件， 当 manager 异常（比如节点压力大被驱逐），可能导致所有 Pod 无法创建和修改，连 manager 自身 pod 也无法创建出来，导致整个集群陷入瘫痪。

:::

<Tabs>
  <TabItem value="1" label="匹配包含指定注解的 Pod">
    <FileBlock file="webhook/check-annotation.yaml" showLineNumbers />
  </TabItem>
  <TabItem value="2" label="匹配指定 label 的 Pod">
    <FileBlock file="webhook/object-selector.yaml" showLineNumbers />
  </TabItem>
</Tabs>
