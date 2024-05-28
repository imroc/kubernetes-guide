# 部署开发富容器

## 部署 YAML

编写 Kubernetes 的 YAML 来部署 `devcontainer`，示例:


```yaml title="devcontainer.yaml"
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app: devcontainer
  name: devcontainer
  namespace: devcontainer
spec:
  selector:
    matchLabels:
      app: devcontainer
  template:
    metadata:
      labels:
        app: devcontainer
    spec:
      containers:
        - image: your.registry.com/private/devcontainer:latest
          imagePullPolicy: IfNotPresent
          name: devcontainer
          tty: true
          stdin: true
          securityContext:
            privileged: true
            runAsUser: 0
            runAsGroup: 0
          volumeMounts:
            - mountPath: /host
              name: host
              mountPropagation: Bidirectional
            - mountPath: /sys/fs/cgroup
              name: cgroup
              readOnly: true
            - mountPath: /root
              name: root
            - mountPath: /data # host 与容器内保持一致的路径，可用于在容器内运行某些项目的容器构建脚本，路径一致方便host上的dockerd对项目路径mount进容器
              name: data
              mountPropagation: Bidirectional
      dnsPolicy: Default
      hostNetwork: true
      hostPID: false
      restartPolicy: Always
      terminationGracePeriodSeconds: 1
      volumes:
        - name: root
          hostPath:
            path: /data/root
            type: DirectoryOrCreate
        - name: cgroup
          hostPath:
            path: /sys/fs/cgroup
            type: Directory
        - name: host
          hostPath:
            path: /
            type: Directory
        - name: data
          hostPath:
            path: /data
            type: DirectoryOrCreate
  updateStrategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
```

## 要点解析

编写 YAMl 时注意以下关键点：
* 镜像填写你构建 `devcotnainer` 时指定的镜像名称。
* `privileged` 置为 true，使用特权容器，避免因权限问题各种报错。
* `dnsPolicy` 置为 Default，表示容器内直接使用宿主机所使用的 DNS 解析，保持容器内外的 DNS 解析行为一致。
* `hostNetwork` 置为 true，直接使用宿主机的网络，不使用容器网络（没必要）。
* 将宿主机根目录挂载到容器内的 `/host` 下，这样就可以在容器内操作宿主机内任意文件，无需登录宿主机的 SSH。
* 将宿主机的 cgroup 目录(`/sys/fs/cgroup`)挂载到容器内同路径位置，因为 systemd 依赖这个才能正常运行。
* 将宿主机的 `/data/root` 挂载到容器的用户目录(`/root`)，因为很多软件都会写入文件到用户目录下，如果不持久化，容器重启后就会丢失。
* 将宿主机的 `/data` 挂载到容器内的相同路径，日常工作用到的源码都存放到 `/data` 的子目录，这样在容器内外路径都是一致的，避免构建镜像时因 client 和 server 识别到的路径不一致造成异常。
