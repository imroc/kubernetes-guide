# 解决容器内时区不一致问题

## 背景

业务程序在使用时间的时候(比如打印日志)，没有指定时区，使用的系统默认时区，而基础镜像一般默认使用 UTC 时间，程序输出时间戳的时候，就与国内的时间相差 8 小时，如何使用国内的时间呢？本文教你如何解决。

## 最佳实践：使用多阶段构建拷贝时区文件

centos 基础镜像内置了时区文件，可以将里面国内的时区文件拷贝到业务镜像中的 `/etc/localtime` 路径，表示系统默认时区是国内时区:

```Dockerfile
FROM centos:latest

FROM ubuntu:22.10

COPY --from=0 /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```