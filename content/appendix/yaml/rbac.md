# RBAC 相关

## 给 roc 授权 test 命名空间所有权限，istio-system 命名空间的只读权限

<FileBlock file="rbac/test-admin-istio-system-readonly.yaml" showLineNumbers />

## 给 roc 授权整个集群的只读权限

<FileBlock file="rbac/readonly-all.yaml" showLineNumbers />

## 给 manager 用户组里所有用户授权 secret 读权限

<FileBlock file="rbac/readonly-all.yaml" showLineNumbers />

## 给 roc 授权集群只读权限 (secret读权限除外)

Secret 读权限比较敏感，不要轻易放开，k8s 的 Role/ClusterRole 没有提供类似 "某资源除外" 的能力，secret 在 core group 下，所以只排除 secret 读权限的话需要列举其它所有 core 下面的资源，另外加上其它所有可能的 group 所有资源(包括CRD):

<FileBlock file="rbac/readonly-exclude-secret.yaml" showLineNumbers />

> 可以借助 `kubectl api-resources -o name` 来列举。

## 限制 ServiceAccount 权限

授权 `build-robot` 这个 ServiceAccount 读取 build 命名空间中 Pod 的信息和 log 的权限:

<FileBlock file="rbac/limit-sa.yaml" showLineNumbers />

## ServiceAccount 最高权限

<FileBlock file="rbac/cluster-admin.yaml" showLineNumbers />
