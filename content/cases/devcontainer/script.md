# 脚本文件分享

## 基础软件安装

一些系统的基础软件包、帮助文档(man命令)以及 locale 和字符集的设置，可统一在 `basic.sh` 里配置。

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
