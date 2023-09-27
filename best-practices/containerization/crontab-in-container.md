# 在容器中使用 crontab

## 准备 crontab 配置文件

新建一个名为 `crontab` 的配置文件，写定时任务规则:

```txt
* * * * * echo "Crontab is working" > /proc/1/fd/1
```

> `/proc/1/fd/1` 表示输出到容器主进程的标准输出，这样我们可以利用 `kubectl logs` 来查看到执行日志。

## 准备 Dockerfile

### CentOS 镜像

```dockerfile
FROM docker.io/centos:7

RUN yum -y install crontabs && rm -rf /etc/cron.*/*

ADD crontab /etc/crontab
RUN chmod 0644 /etc/crontab
RUN crontab /etc/crontab

CMD ["crond", "-n"]
```

### Ubuntu 镜像

```dockerfile
FROM docker.io/ubuntu:20.04

RUN apt-get update && apt-get install -y cron && rm -rf /etc/cron.*/*

ADD crontab /etc/crontab
RUN chmod 0644 /etc/crontab
RUN crontab /etc/crontab

CMD ["cron", "-f", "-l", "2"]
```

## 打包镜像

```bash
docker build -t docker.io/imroc/crontab:latest -f Dockerfile .
# podman build -t docker.io/imroc/crontab:latest -f Dockerfile .
```