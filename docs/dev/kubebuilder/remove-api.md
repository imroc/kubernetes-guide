# 移除 API

## 场景

创建了新的试验性 API 并围绕它开发相关逻辑，但发现它不合适，需要将其从 API 中移除。

## 编辑 PROJECT 文件

将 API 从 PROJECT 文件中移除（resources 数组下）。

## 移除 types

移除 `api` 目录下相关的结构体定义。

## 移除 CRD 定义

移除自动生成的 CRD 定义，在 `config/crd/bases` 目录下。

## 移除 RBAC 定义

删除如下文件：

- `config/rbac/xxx_admin_role.yaml`
- `config/rbac/xxx_editor_role.yaml`
- `config/rbac/xxx_viewer_role.yaml`

删除下面文件中关于该 API 的部分：

- `config/rbac/role.yaml`
- `config/rbac/kustomization.yaml`

## 删除 samples

删除 `config/samples` 目录下相关的样例资源以及 `config/samples/kustomization.yaml` 中相关的文件引用。

## 删除 webhook

如果该 API 包含 webhook：
1. 删除 `config/webhook/manifests.yaml` 中相关的内容。
2. 删除 webhook 相关代码文件，`internal/webhook/xxx/xxx_webhook.go` 和 `internal/webhook/xxx/xxx_webhook_test.go`

## 删除 controller

如果为该 API 实现了 controller，需删除相关代码文件：
- `internal/controller/xxx_controller.go`
- `internal/controller/xxx_controller_test.go`

## 删除 Manager 相关引用

Manager 的初始化逻辑中：
1. controller 调用 SetupWithManager 的部分删掉。
2. webhook 调用 `SetupXXXWebhookWithManager` 的部分删掉。
