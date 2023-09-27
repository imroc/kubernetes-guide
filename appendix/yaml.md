# 实用 YAML

## RBAC 相关

### 给 roc 授权 test 命名空间所有权限，istio-system 命名空间的只读权限

```yaml
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: admin
  namespace: test
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]

---

kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: admin-to-roc
  namespace: test
subjects:
  - kind: User
    name: roc
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: admin
  apiGroup: rbac.authorization.k8s.io

---

kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly
  namespace: istio-system
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "watch", "list"]

---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly-to-roc
  namespace: istio-system
subjects:
  - kind: User
    name: roc
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: readonly
  apiGroup: rbac.authorization.k8s.io
```

### 给 roc 授权整个集群的只读权限

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "watch", "list"]

---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly-to-roc
subjects:
  - kind: User
    name: roc
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: readonly
  apiGroup: rbac.authorization.k8s.io
```

### 给 manager 用户组里所有用户授权 secret 读权限

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global
subjects:
- kind: Group
  name: manager
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 给 roc 授权集群只读权限 (secret读权限除外)

secret 读权限比较敏感，不要轻易放开，k8s 的 Role/ClusterRole 没有提供类似 "某资源除外" 的能力，secret 在 core group 下，所以只排除 secret 读权限的话需要列举其它所有 core 下面的资源，另外加上其它所有可能的 group 所有资源(包括CRD):

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly
rules:
- apiGroups: [""]
  resources:
  - bindings
  - componentstatuses
  - configmaps
  - endpoints
  - events
  - limitranges
  - namespaces
  - nodes
  - persistentvolumeclaims
  - persistentvolumes
  - pods
  - podtemplates
  - replicationcontrollers
  - resourcequotas
  - serviceaccounts
  - services
  verbs: ["get", "list"]
- apiGroups:
  - cert-manager.io
  - admissionregistration.k8s.io
  - apiextensions.k8s.io
  - apiregistration.k8s.io
  - apps
  - authentication.k8s.io
  - autoscaling
  - batch
  - certificaterequests.cert-manager.io
  - certificates.cert-manager.io
  - certificates.k8s.io
  - cloud.tencent.com
  - coordination.k8s.io
  - discovery.k8s.io
  - events.k8s.io
  - extensions
  - install.istio.io
  - metrics.k8s.io
  - monitoring.coreos.com
  - networking.istio.io
  - node.k8s.io
  - policy
  - rbac.authorization.k8s.io
  - scheduling.k8s.io
  - security.istio.io
  - storage.k8s.io
  resources: ["*"]
  verbs: [ "get", "list" ]

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: roc
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readonly
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: roc
```

> 可以借助 `kubectl api-resources -o name` 来列举。

### 限制 ServiceAccount 权限

授权 `build-robot` 这个 ServiceAccount 读取 build 命名空间中 Pod 的信息和 log 的权限:

``` yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-robot
  namespace: build

---

apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: build
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]

---

apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: build
subjects:
- kind: ServiceAccount
  name: build-robot
  namespace: build
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### ServiceAccount 最高权限

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-admin
  namespace: kube-system

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: cluster-admin
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```