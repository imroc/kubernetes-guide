# 多版本 API 开发

## 背景

随着 controller 的不断迭代，可能需要新增或变更某些功能，此时一般需要新增 API 版本进行支持，我们就需要管理多个 API 版本，本文介绍用 kubebuilder 开发 controller 时如何高效且优雅的管理多个 API 版本。


## 新增 API 版本

如果要对某个 API 新增版本，先用 kubebuilder 操作新建一下，如：

```bash
kubebuilder create api --group webapp --version v1beta2 --kind Guestbook
```

然后将上一个版本的 API 的 `xx_types.go` 文件拷贝覆盖到新版本的 `xx_types.go` 文件中，并修改新版本 `xx_types.go` 文件中的包名为新版本的包名。

在新版本的 API 结构体中上面加上下面的注释标记并移出其它版本 API 结构体的这个标记（如果有的话）：

```go
// +kubebuilder:conversion:hub
```

## 参考资料

- [Kubebuilder Tutorial: Multi-Version API](https://book.kubebuilder.io/multiversion-tutorial/tutorial)
