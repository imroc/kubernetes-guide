# 定义 ReadOnlyMany 存储的方法

## 概述

要实现 `ReadOnlyMany` (多机只读) 的前提条件是后端存储是共享存储，在腾讯云上有 `COS` (对象存储) 和 `CFS` (文件存储) 两种。本文介绍这两种共享存储在腾讯云容器服务环境里定义成 PV 的使用方法。

## COS

1. `accessModes` 指定 `ReadOnlyMany`。
2. `csi.volumeAttributes.additional_args` 指定 `-oro`。

yaml 示例:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: registry
spec:
  accessModes:
  - ReadOnlyMany
  capacity:
    storage: 1Gi
  csi:
    readOnly: true
    driver: com.tencent.cloud.csi.cosfs
    volumeHandle: registry
    volumeAttributes:
      additional_args: "-oro"
      url: "http://cos.ap-chengdu.myqcloud.com"
      bucket: "roc-**********"
      path: /test
    nodePublishSecretRef:
      name: cos-secret
      namespace: kube-system
```

## CFS

1. `accessModes` 指定 `ReadOnlyMany`。
2. `mountOptions` 指定 `ro`。

yaml 示例:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: test
spec:
  accessModes:
  - ReadOnlyMany
  capacity:
    storage: 10Gi
  storageClassName: cfs
  persistentVolumeReclaimPolicy: Retain
  volumeMode: Filesystem
  mountOptions:
  - ro
  csi:
    driver: com.tencent.cloud.csi.cfs
    volumeAttributes:
      host: 10.10.99.99
      path: /test
    volumeHandle: cfs-********
```
