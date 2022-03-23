# 为 Pod 设置内核参数

本文介绍为 Pod 设置内核参数的几种方式。

## 在 securityContext 中指定 sysctls

自 k8s 1.12 起，[sysctls](https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/) 特性 beta 并默认开启，允许用户在 pod 的 `securityContext` 中设置内核参数，用法示例:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sysctl-example
spec:
  securityContext:
    sysctls:
    - name: net.core.somaxconn
      value: "1024"
    - name: net.core.somaxconn
      value: "1024"
  ...
```

不过使用该方法，默认情况下有些认为是 unsafe 的参数是不能改的，需要将其配到 kubelet 的 `--allowed-unsafe-sysctls` 中才可以用。

## 使用 initContainers

如果希望设置内核参数更简单通用，可以在 initContainer 中设置，不过这个要求给 initContainer 打开 `privileged` 权限。示例:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sysctl-example-init
spec:
  initContainers:
  - image: busybox
    command:
    - sh
    - -c
    - |
      sysctl -w net.core.somaxconn=65535
      sysctl -w net.ipv4.ip_local_port_range="1024 65535"
      sysctl -w net.ipv4.tcp_tw_reuse=1
      sysctl -w fs.file-max=1048576
    imagePullPolicy: Always
    name: setsysctl
    securityContext:
      privileged: true
  containers:
  ...
```

> 这里用了 privileged 容器，只是为了让这个 container 有权限修改当前容器网络命名空间中的内核参数，只要 Pod 没使用 hostNetwork，内核参数的修改是不会影响 Node 上的内核参数的，两者是隔离的，所以不需要担心会影响 Node 上其它 Pod 的内核参数 (hostNetwork 的 Pod 就不要在 Pod 上修改内核参数了)。

## 使用 tuning CNI 插件统一设置 sysctl

如果想要为所有 Pod 统一配置某些内核参数，可以使用 [tuning](https://github.com/containernetworking/plugins/tree/master/plugins/meta/tuning) 这个 CNI 插件来做:

```json
{
  "name": "mytuning",
  "type": "tuning",
  "sysctl": {
          "net.core.somaxconn": "500",
          "net.ipv4.tcp_tw_reuse": "1"
  }
}
```

## 参考资料

* [Using sysctls in a Kubernetes Cluster](https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/)
* [tuning 插件文档](https://www.cni.dev/plugins/current/meta/tuning/)