# Webhook 开发

## 概述

K8S 有 MutatingWebhook 和 ValidatingWebhook 两种类型的 Webhook，分别用于修改 Pod 的 Spec 和验证 Pod 的 Spec。使用 kubebuilder 创建 Webhook 脚手架代码用 `kubebuilder create webhook`，`--defaulting` 和 `--programmatic-validation`  参数分别表示 MutatingWebhook 和 ValidatingWebhook。

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
