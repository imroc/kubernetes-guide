# 在容器内使用 systemd

## 概述

某些情况下我们需要在容器内使用 systemd 去拉起进程，比如业务历史包袱重，有许多依赖组件，不能仅仅只启动1个业务进程，还有许多其它进程需要启动，短时间内不好改造好，过渡期间使用 systemd 作为主进程拉起所有依赖进程。

## 安装 systemd

如果你用的基础镜像是 centos，那么已经内置了 systemd，建议使用 `centos:8`，启动入口是 `/sbin/init`；如果是 ubuntu，那么需要安装一下 systemd，启动入口是 `/usr/sbin/systemd`，Dockerfile 示例:

```dockerfile
FROM ubuntu:22.04
RUN apt update -y
RUN apt install -y systemd
```

## 示例

systemd 相比业务进程比较特殊，它运行起来需要以下条件:
1. 自己必须是 1 号进程，所以不能启用 `shareProcessNamespace`。
2. 需要对 `/run` 和 `/sys/fs/cgroup` 等路径进行挂载，通常需要给到 systemd 容器一定特权。

最简单的方式是将运行 systemd 的 container 设为特权容器，示例:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: systemd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: systemd
  template:
    metadata:
      labels:
        app: systemd
    spec:
      containers:
      - name: systemd
        image: centos:8
        command:
        - /sbin/init
        securityContext:
          privileged: true # 设置特权
```

如果希望尽量减少特权，可以只读方式挂载 hostPath `/sys/fs/cgroup`，然后 capabilities 给个 `SYS_ADMIN`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: systemd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: systemd
  template:
    metadata:
      labels:
        app: systemd
    spec:
      containers:
      - name: systemd
        image: centos:8
        command:
        - /sbin/init
        securityContext:
          capabilities:
            add:
            - SYS_ADMIN # 设置容器权限
          privileged: false # 非特权
        volumeMounts:
        - mountPath: /sys/fs/cgroup
          name: cgroup
          readOnly: true # 只读方式挂载 cgroup 目录
      volumes:
      - hostPath:
          path: /sys/fs/cgroup
          type: ""
        name: cgroup
```

如果用 ubuntu 安装了 systemd，用法类似的，只是启动入口变成了 `/usr/bin/systemd`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: systemd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: systemd
  template:
    metadata:
      labels:
        app: systemd
    spec:
      containers:
      - name: systemd
        image: cr.imroc.cc/library/systemd:ubuntu
        command:
        - /usr/bin/systemd
        securityContext:
          capabilities:
            add:
            - SYS_ADMIN
          privileged: false
        volumeMounts:
        - mountPath: /sys/fs/cgroup
          name: cgroup
      volumes:
      - hostPath:
          path: /sys/fs/cgroup
          type: ""
        name: cgroup
```