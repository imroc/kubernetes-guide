# 多版本 API 开发

## 背景

随着 controller 的不断迭代，可能需要新增或变更某些功能，此时一般需要新增 API 版本进行支持，我们就需要管理多个 API 版本，本文介绍用 kubebuilder 开发 controller 时如何高效且优雅的管理多个 API 版本。


## 新增 API 版本

如果要对某个 API 新增版本，先用 kubebuilder 操作新建一下，如：

```bash
kubebuilder create api --group webapp --version v1beta2 --kind Guestbook
```

然后将上一个版本的 API 的 `xx_types.go` (如 `guestbook_types.go`) 文件拷贝覆盖到新版本的 `xx_types.go` 文件中，并修改新版本 `xx_types.go` 文件中的包名为新版本的包名。

在新版本的 API 结构体中上面加上下面的注释标记并移出其它版本 API 结构体的这个标记（如果有的话），表示后续新增的对象使用该版本 API 进行存储（存量的还是用旧版本存储）：

```go
// +kubebuilder:storageversion
```

## API 自动转换

客户端（如kubectl、client-go）在请求 API 时，会指定 API 版本，当存储的 API 版本与请求的版本不一致时，APIServer 可以调用 controller 提供的 webhook 进行自动转换，下面是实现自动转换 API 版本的 webhook 的方法。

首先使用 `kubebuilder` 创建 webhook（假设是希望将 v1alpha1 的 Guestbook 转换成 v1beta1）：

```bash
kubebuilder create webhook --group webapp --version v1beta1 --kind Guestbook --conversion --spoke v1alpha1
```

- `--version` 指定 Hub 版本（存储的 API 版本)，通常是最新版本。
- `--spoke` 指定请求的要被自动转换的其它 API 版本，通常是旧版本。

:::tip[注意]
- 以上只是实现 API 自动转换需要的 create webhook 参数，如果还有其他 webhook 需求（如 ValidatingWebhook `--programmatic-validation`，自动设置默认值 `--defaulting`）也需要带上，相同 API 版本的 webhook 创建后不能重新执行 create webhook 命令来追加功能，需一次性到位。
:::

执行后可以看到：
1. v1beta1 下新增了 `xx_conversion.go` 文件，为 API 结构体新增了 `Hub` 空函数，实现 [Hub](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/conversion#Hub) 接口，用于标记该 API 版本是 Hub 版本，其它版本的 API 将会自动转换成这个版本。
2. v1alpha1 下也新增了 `xx_conversion.go` 文件，为 API 结构体新增了 `ConvertTo` 和 `ConvertFrom` 函数，实现 [Convertible](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/conversion#Convertible) 接口，将会被 webhook 自动调用用于转换 API 版本。

然后将旧版本 API 下的 `xx_webhook.go`（包含 `SetupWebhookWithManager`） 和 `xx_webhook_test.go` 移动到新版本 API 下，并修改包名为新版本的包名，调用 `SetupWebhookWithManager` 的地方也跟着改一下引用到新版本。Webhook 中的其它相关逻辑如果需要改动也要改一下（比如 `ValidateXXX`, `Default` 等），围绕新版本 API 来改动相关逻辑。
