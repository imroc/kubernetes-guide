# 软件包安装

## 基础软件安装

一些系统的基础软件包、帮助文档(man命令)以及 locale 和字符集的设置，可统一在 `basic.sh` 里配置：

```bash title="scripts/basic.sh"
#!/bin/bash

set -ex

export DEBIAN_FRONTEND=noninteractive

apt update -y
apt upgrade -y

# enable man pages
apt install -y man-db
yes | unminimize

# timezone and locale
apt install -y tzdata locales
ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
dpkg-reconfigure -f noninteractive tzdata
locale-gen zh_CN.UTF-8
update-locale LANG=zh_CN.UTF-8

# comman tools
apt install -y lsb-release gnupg software-properties-common \
	sudo gzip zip unzip curl wget git git-flow lrzsz \
	ssh rsync lsof tree jq build-essential autoconf automake \
	pkg-config systemd systemd-sysv htop ca-certificates sysstat iotop \
	gettext nginx patch fswatch silversearcher-ag vim psmisc \
	tig bison xclip xsel lld iperf flex

# shell
apt install -y zsh fish

# net tools
apt install -y telnet iputils-arping node-ws ethtool iptables nftables \
	conntrack netcat-openbsd iproute2 net-tools openssl dnsutils tcpdump \
	iputils-ping

# build tools
apt install -y protobuf-compiler llvm llvm-dev libtool libssl-dev libelf-dev \
	libtinfo6 libevent-dev ncurses-dev libluajit-5.1-dev libcurl4-openssl-dev \
	libreadline-dev ninja-build cmake make

# ebpf
apt install -y bcc libbpf-dev libbpfcc libbpfcc-dev bpfcc-tools
```

## 第三方软件包安装

一些软件包不能直接用 apt 软件源安装，可抽取到 `3rd-tools.sh` 进行安装：

```bash title="scripts/3rd-tools.sh"
#!/bin/bash

set -ex

# docker cli
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
	"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |
	tee /etc/apt/sources.list.d/docker.list >/dev/null
apt-get update -y
apt-get install -y docker-ce-cli=5:26.1.1-1~ubuntu.24.04~noble
mkdir -p /bins && mv /usr/bin/docker /bins/docker # 隐藏真实 docker 客户端，用脚本代理（默认加 -H 指向 host 的 socket，实现 dind，部分容器编译依赖这个)

# sdkman
curl -s "https://get.sdkman.io" | bash

# git-lfs (https://github.com/git-lfs/git-lfs/blob/main/INSTALLING.md)
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install -y git-lfs

# httppie https://httpie.io/docs/cli/debian-and-ubuntu
curl -SsL https://packages.httpie.io/deb/KEY.gpg | gpg --dearmor -o /usr/share/keyrings/httpie.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/httpie.gpg] https://packages.httpie.io/deb ./" | tee /etc/apt/sources.list.d/httpie.list >/dev/null
apt update -y
apt install -y httpie

# github cli
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" |
	tee /etc/apt/sources.list.d/github-cli.list >/dev/null
apt update -y
apt install gh -y
```
