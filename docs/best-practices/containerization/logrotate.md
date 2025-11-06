# 使用 sidecar 轮转日志

## 背景

业务程序如果将日志写到日志文件，如果没有自动轮转，可能会撑爆磁盘导致业务异常，甚至可能影响节点上其它 Pod。

如果所使用的日志框架不支持日志轮转，或者不想改动业务代码，可以通过 sidecar 来对业务日志进行自动轮转，本文介绍如何基于 [docker-logrotate](https://github.com/imroc/docker-logrotate) 来实现日志轮转。

## docker-logrotate 介绍

[docker-logrotate](https://github.com/imroc/docker-logrotate) 是一个将 logrotate 容器化的开源项目，该项目自动构建出的容器镜像 [imroc/logrotate](https://hub.docker.com/r/imroc/logrotate) 是基于 alpine，预装了 logrotate，且支持多 CPU 架构的容器镜像，还可以通过环境变量的方式控制 logrotate 配置。

## 示例一：自动轮转 nginx ingress 的日志

配置 [ingress-nginx](https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx) helm chart 的 `values.yaml`：

```yaml
controller:
  config:
    access-log-path: /var/log/nginx/nginx_access.log
    error-log-path: /var/log/nginx/nginx_error.log
  extraVolumes:
    - name: log
      emptyDir: {}
  extraVolumeMounts:
    - name: log
      mountPath: /var/log/nginx
  extraContainers: # logrotate sidecar
    - name: logrotate
      image: imroc/logrotate:latest
      imagePullPolicy: IfNotPresent
      env:
        - name: LOGROTATE_FILE_PATTERN
          value: "/var/log/nginx/nginx_*.log"
        - name: LOGROTATE_FILESIZE
          value: "20M"
        - name: LOGROTATE_FILENUM
          value: "10"
        - name: CRON_EXPR
          value: "*/1 * * * *"
        - name: CROND_LOGLEVEL
          value: "7"
      volumeMounts:
        - name: log # share log directory
          mountPath: /var/log/nginx
```

## 示例二：自动轮转 nginx 日志

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          volumeMounts:
            - name: log # share log directory
              mountPath: /var/log/nginx
        - name: logrotate
          image: imroc/logrotate:latest
          env:
            - name: LOGROTATE_FILE_PATTERN
              value: "/var/log/nginx/*.log"
            - name: LOGROTATE_FILESIZE
              value: "20M"
            - name: LOGROTATE_FILENUM
              value: "10"
            - name: CRON_EXPR
              value: "*/1 * * * *"
            - name: CROND_LOGLEVEL
              value: "7"
          volumeMounts:
            - name: log # share log directory
              mountPath: /var/log/nginx
      volumes:
        - name: log
          emptyDir: {}
```
