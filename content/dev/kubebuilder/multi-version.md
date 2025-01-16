# 多版本 API 开发

## 背景

随着 controller 的不断迭代，可能需要新增或变更某些功能，此时一般需要新增 API 版本进行支持，我们就需要管理多个 API 版本，本文介绍用 kubebuilder 开发 controller 时如何高效且优雅的管理多个 API 版本。


## 选择存储版本 API

如果一个 CRD 有多个版本，通常我们使用最新版的 API 进行存储和调谐，但也需要能支持自动转换成旧版本。

在新版本的 API 结构体中上面加上下面的注释标记：

```go
// +kubebuilder:conversion:hub
```

## 参考资料

- [Kubebuilder Tutorial: Multi-Version API](https://book.kubebuilder.io/multiversion-tutorial/tutorial)
