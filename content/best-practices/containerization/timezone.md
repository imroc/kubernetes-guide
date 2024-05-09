# 解决容器内时区不一致问题

## 背景

业务程序在使用时间的时候(比如打印日志)，没有指定时区，使用的系统默认时区，而基础镜像一般默认使用 UTC 时间，程序输出时间戳的时候，就与国内的时间相差 8 小时，如何使用国内的时间呢？本文教你如何解决。

## 方案一：指定 TZ 环境变量

很多编程语言都支持 `TZ` 这个用于设置时区的环境变量，可以在部署工作负载的时候，为容器指定该环境变量，示例：

<FileBlock showFileNumbers file="containerization/tz-env.yaml" showLineNumbers />

## 方案二：Dockerfile 里设置时区

下面给出在一些常见的基础镜像里设置时区的实例：

<Tabs>
  <TabItem value="ubuntu" label="Ubuntu">
    <FileBlock file="containerization/ubuntu-tz.dockerfile" />
  </TabItem>
  <TabItem value="alpine" label="Alpine">
    <FileBlock file="containerization/alpine-tz.dockerfile" />
  </TabItem>
  <TabItem value="centos" label="CentOS">
    <FileBlock file="containerization/centos-tz.dockerfile" />
  </TabItem>
</Tabs>

## 方案三：挂载主机时区配置到容器（不推荐）

最后一种思路是将 Pod 所在节点的时区文件挂载到容器内 `/etc/localtime`，这种方式对 Pod 有一定侵入性，而且依赖主机内时区配置，在不得已的情况下不推荐使用。

下面是 YAML 示例：

<FileBlock showFileNumbers file="containerization/mount-tz.yaml" showLineNumbers />
