# 编写 Dockerfile

## Dockerfile 组织方法

要打造超级富容器，最重要的还是编写 `Dockerfile`，富容器的 `Dockerfile` 比较特殊，因为需要安装很多依赖，涉及的脚本可能很多，如果都直接写到 `Dockerfile` 中，一般会超出最大的 layer 数量限制，最主要还是维护起来很麻烦。

可以将各种操作拆分成许多脚本文件，然后在 `Dockerfile` 中拷贝脚本文件进去执行，这样维护起来就很简单，需要改哪部分内容就直接进对应的脚本文件中改就行了。然后将需要拷贝的配置文件，按照文件最终被拷贝进容器的目录结构存放，在 `Dockerfile` 中执行 rsync 的脚本将配置文件保持目录结构同步过去。

## 脚本文件

我将所有脚本放到了 `scripts` 目录，目录结构：

```txt
scripts
├── 3rd-tools.sh
├── basic.sh
├── download-and-install.sh
├── final.sh
├── kubectl.sh
├── lang
│   ├── c-cpp.sh
│   ├── go.sh
│   ├── java.sh
│   ├── julia.sh
│   ├── lua.sh
│   ├── nodejs.sh
│   ├── php.sh
│   ├── python.sh
│   ├── ruby.sh
│   └── rust.sh
└── sync-config.sh
```

## 配置文件
配置文件放到了 `config` 目录，目录结构：

```txt
config
├── after
│   ├── etc
│   │   ├── nerdctl
│   │   │   └── nerdctl.toml
│   │   ├── rc.local
│   │   └── ssh
│   │       ├── sshd_config
│   │       ├── ssh_host_ecdsa_key
│   │       ├── ssh_host_ecdsa_key.pub
│   │       ├── ssh_host_ed25519_key
│   │       ├── ssh_host_ed25519_key.pub
│   │       ├── ssh_host_rsa_key
│   │       └── ssh_host_rsa_key.pub
│   ├── lib
│   │   └── systemd
│   │       └── system
│   │           └── rc-local.service
│   ├── root
│   │   ├── .aliases
│   │   ├── .config
│   │   │   └── k9s
│   │   │       └── plugin.yml
│   │   ├── .cos.image.yaml
│   │   ├── .docker
│   │   │   └── config.json
│   │   ├── .gitconfig
│   │   ├── .git-credentials
│   │   ├── .gitignore_global
│   │   ├── .m2
│   │   │   └── settings.xml
│   │   ├── .p10k.zsh
│   │   ├── .ssh
│   │   │   ├── authorized_keys
│   │   │   ├── id_rsa
│   │   │   └── id_rsa.pub
│   │   └── .tccli
│   │       └── default.credential
│   └── usr
│       └── local
│           └── bin
│               ├── docker
│               ├── init-root
│               ├── sync-images
│               ├── sync-image-tags
│               └── update-bin
└── before
    └── root
        ├── .zshenv
        └── .zshrc
```

将配置分成了两批:
1. `before` 用于在编译镜像的前期拷进去，主要是 shell 的 rc 和环境变量文件，因为安装有些工具时会自动修改 rc 文件和环境变量文件，如果是在安装完再拷进去，文件就会被覆盖，自动追加的配置就会被抹掉，所以要在前期拷进去。
2. `after` 则是在后期拷进去，目的就是为了以这里声明的配置为准，如果容器内有相应文件，则覆盖。

## Dockerfile 内容

最后在 `Dockerfile` 中，将之前所写的脚本文件拷进去有序执行，配置文件一前一后拷贝，通过 rsync 保留目录结构同步过来：

```dockerfile
FROM ubuntu:24.04

COPY ./config /config

# 基础软件
#
COPY ./scripts/basic.sh /run.sh
RUN /run.sh

# 安装前的初始配置文件
RUN rsync -av /config/before/root/ /root/

# 第三方软件包和工具
#
COPY ./scripts/3rd-tools.sh /run.sh
RUN /run.sh

# 语言相关工具和软件包
#
COPY ./scripts/lang/c-cpp.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/python.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/julia.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/go.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/rust.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/ruby.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/php.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/nodejs.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/java.sh /run.sh
RUN /run.sh

COPY ./scripts/lang/lua.sh /run.sh
RUN /run.sh

# kubectl 及其插件
#
COPY ./scripts/kubectl.sh /run.sh
RUN /run.sh

# 下载和编译安装二进制
#
COPY ./scripts/download-and-install.sh /run.sh
RUN /run.sh

# 安装后的配置文件覆盖
#
COPY ./scripts/sync-config.sh /run.sh
RUN /run.sh

# 最后的整理
#
COPY ./scripts/final.sh /run.sh
RUN /run.sh && rm /run.sh

CMD ["/lib/systemd/systemd"]
```

## FAQ

* Q: 为什么不直接拷贝目录下所有脚本一次全部执行？
* A: 这样虽然方便，但无法享受到容器构建的缓存，每次都要全量执行所有脚本，而分成多个 RUN 指令执行则可以利用缓存加速构建。

* Q: 为什么容器入口是 `/lib/systemd/systemd`？
* A: 为了让 systemd 作为 1 号进程启动，让富容器像虚拟机一样。
