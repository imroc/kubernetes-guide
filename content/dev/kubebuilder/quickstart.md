# 快速上手

## 安装

如果你有 Homebrew，可以通过 `brew install kubebuilder` 一键安装。

没有的话可以通过下面的脚本安装 `kubebuilder` 二进制到 `PATH` 下：

```txt
# download kubebuilder and install locally.
curl -L -o kubebuilder "https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)"
chmod +x kubebuilder && sudo mv kubebuilder /usr/local/bin/
```

## 创建项目

```bash
mkdir -p ~/projects/guestbook
cd ~/projects/guestbook
kubebuilder init --domain my.domain --repo my.domain/guestbook
```

- `domain` 是指 API Group 的域名后缀，比如要创建的 API 的 Group 是 `test.my.domain`，那么 `domain` 就是 `my.domain`。
- `repo` 是 go 项目的 go module 名称，相当于 `go mod init` 的参数。

## 创建 API

假设要创建的 API 的 `apiVersion` 是 `webapp.my.domain/v1alpha1`，`kind` 是 `Guestbook`，那么命令如下：

```bash
kubebuilder create api --group webapp --version v1alpha1 --kind Guestbook
```

- `group` 是 API Group 的前缀，完整 API Group 是这个 `group` 参数加上前面 `kubebuilder init` 时指定的 `domain`，前面指定的是 `my.domain`，所以完整的 API Group 是 `webapp.my.domain`。
- `version` 是 API 的版本，比如 `v1alpha1`。
- `kind` 是 API 的 Kind，比如 `Guestbook`。


## 生成代码和 YAML

创建或修改 API 后：
1. 执行 `make manifests` 可生成相关 YAML，在 `config` 目录下。
2. 执行 `make generate` 可生成相关代码，在 `api` 目录下，主要是更新 `zz_generated.deepcopy.go`。

## 参考资料

- [Kubebuilder Quick Start](https://book.kubebuilder.io/quick-start)
