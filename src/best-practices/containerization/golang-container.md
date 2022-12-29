# Go 应用容器化

## 使用多阶段构建编译

可以使用 golang 的官方镜像进行编译，建议使用静态编译，因为 golang 官方镜像默认使用的基础镜像是 debian，如果使用默认的编译，会依赖依赖一些动态链接库，当业务镜像使用了其它发行版基础镜像，且动态链接库不一样的话 (比如 alpine)，就会导致程序启动时发现依赖的动态链接库找不到而无法启动:

```txt
standard_init_linux.go:211: exec user process caused "no such file or directory"
```

以下是多阶段构建静态编译 golang 程序的 Dockerfile 示例:

```Dockerfile
FROM golang:latest as builder

COPY . /build

WORKDIR /build

RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w -extldflags=-static' -o /app

FROM ubuntu:22.10

COPY --from=builder /app /

CMD ["/app"]
```

如果希望最小化镜像，可以用空基础镜像，让镜像中只包含一个静态编译后 go 二进制:

```Dockerfile
FROM golang:latest as builder

COPY . /build

WORKDIR /build

RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w -extldflags=-static' -o /app

FROM scratch

COPY --from=builder /app /

CMD ["/app"]
```

> 建议 k8s 1.23 及其以上版本使用 scratch 基础镜像，即使镜像中不包含 bash 等调试工具，也可以 [使用临时容器来进行调试](https://kubernetes.io/zh-cn/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container)。