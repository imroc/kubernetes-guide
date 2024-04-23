# 精简 Docker 镜像

在生产环境中，往往需要精简容器镜像，即让 Dockerfile 构建出来的镜像体积足够小，本文介绍如何优雅的为 Docker 镜像瘦身。

## 精简镜像的好处

* 减少构建时间。
* 减少磁盘使用量。
* 减少下载时间，加快容器启动速度，在需要快速扩容的场景下显得尤为重要。
* 降低带宽压力。在大规模扩容的场景下，大量镜像并发拉取，镜像仓库或任意节点达到带宽瓶颈都会影响扩容速度，精简的镜像会降低带宽压力，从而降低达到带宽瓶颈的概率和时长。
* 提高安全性，减少攻击面积。无用的依赖少，从而大大减少被攻击目标。

## 使用精简的基础镜像

### alpine

Alpine一个基于 musl libc 和 busybox、面向安全的轻量级 Linux 发行版，压缩体积只有 3M 左右，很多流行的镜像都有基于 alpine 的制作的基础镜像。

### scratch

scratch 是一个空镜像，如果你的应用是一个包含所有依赖的二进制（不依赖动态链接库），可以使用 scratch 作为基础镜像，这样镜像的体积几乎就等于你 COPY 进去的二进制的体积。

示例：

```dockerfile showLineNumbers
FROM scratch
COPY app /app
CMD ["/app"]
```

### busybox

如果你希望镜像里可以包含一些常用的 Linux 工具，busybox 镜像是个不错选择，它集成了一百多个最常用 Linux 命令和工具的软件工具箱，镜像压缩体积只有不到 1M，非常便于构建小镜像。

### distroless

distroless 镜像，它仅包含您的应用程序及其运行时依赖项。它们不包含您希望在标准 Linux 发行版中找到的包管理器、shell或任何其他程序。
由于Distroless是原始操作系统的精简版本，不包含额外的程序。容器里并没有Shell！如果黑客入侵了我们的应用程序并获取了容器的访问权限，他也无法造成太大的损害。也就是说，程序越少则尺寸越小也越安全。不过，代价是调试更麻烦。

:::tip[注意]

我们不应该在生产环境中，将Shell附加到容器中进行调试，而应依靠正确的日志和监控。

:::

示例：

```dockerfile showLineNumbers
FROM node:8 as build

WORKDIR /app
COPY package.json index.js ./
RUN npm install

FROM gcr.io/distroless/nodejs

COPY --from=build /app /
EXPOSE 3000
CMD ["index.js"]
```

### Distroless vs Alpine 

如果是在生产环境中运行，并且注重安全性， Distroless 镜像可能会更合适。

Docker镜像中每增加一个二进制程序，就会给整个应用程序带来一定的风险。在容器中只安装一个二进制程序即可降低整体风险。

举个例子，如果黑客在运行于Distroless的应用中发现了一个漏洞，他也无法在容器中创建Shell，因为根本就没有。

如果更在意要是大小，则可以换成Alpine基础镜像。

这两个都很小，代价是兼容性。Alpine用了一个稍稍有点不一样的C标准库————muslc，时不时会碰到点兼容性的问题。

:::tip

原生基础镜像非常适合用于测试和开发。它的尺寸比较大，不过用起来就像你主机上安装的Ubuntu一样。并且，你能访问该操作系统里有的所有二进制程序。

:::

## 清理包管理器缓存

在 Dockerfile 中使用包管理器安装依赖的软件包时，往往会产生一些缓存数据，可以清理掉以减少镜像体积。

### Alpine

如果使用 alpine 基础镜像，可以在用 `apk add` 安装软件包时加 `--no-cache`：

```dockerfile showLineNumbers
FROM alpine:latest

# highlight-next-line
RUN apk add --no-cache tzdata ca-certificates
```

### Ubuntu/Debian

```dockerfile showLineNumbers
FROM ubuntu:latest

RUN apt update -y && apt install -y curl

# highlight-start
RUN apt-get clean autoclean && \
  apt-get autoremove --yes && \
  rm -rf /var/lib/{apt,dpkg,cache,log}/
# highlight-end
```

## 使用多阶段构建

Dockerfile 支持多阶段构建，即有多个 `FROM` 指令，最终构建出的镜像由由最后一个 `FROM` 之后的指令决定，通常可以把这之前的指令用作编译，之后的指令用作打包，打包阶段可以将编译阶段产生的文件拷贝过来，这样可以实现在最终镜像中只保留运行程序所需要的内容。

下面是使用 Golang 静态编译二进制，然后 COPY 到 scratch 镜像的 Dockerfile 示例：

```dockerfile showLineNumbers
FROM golang:latest AS build
WORKDIR /workspace
COPY . .
# 静态编译二进制
RUN CGO_ENABLED=0 go build -o app -ldflags '-w -extldflags "-static"' .

FROM scratch
# 拷贝二进制到空镜像
COPY --from=build /workspace/app /usr/local/bin/app
CMD ["app"]
```
