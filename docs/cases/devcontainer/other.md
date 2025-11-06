# 下载和编译其它软件

## 概述

很多开源软件并不支持通过包管理器安装，或者包管理器中的版本比较滞后，希望安装的是最新版本，这时候我们就需要自己下载最新二进制，或者自己编译二进制进行安装。

本文介绍日常开发中常用的工具安装方法。

## 安装 kubectl 及其插件

kubectl 是云原生玩家最常用的工具，除了 kubectl 本身之外，还有 kubectl 的一些列常用插件，我们可以单独用个脚本文件来安装 kubectl 及其插件：

```bash title="scripts/kubectl.sh"
#!/bin/bash

set -ex

# kubectl
wget -O /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$(dpkg --print-architecture)/kubectl"
chmod +x /usr/local/bin/kubectl

# krew
(
	set -x
	cd "$(mktemp -d)" &&
		KREW="krew-linux_$(dpkg --print-architecture)" &&
		curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
		tar zxvf "${KREW}.tar.gz" &&
		./"${KREW}" install krew
)
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"
kubectl krew index add kvaps https://github.com/kvaps/krew-index
kubectl krew update
kubectl krew install kvaps/node-shell
kubectl krew install ctx
kubectl krew install explore
kubectl krew install fuzzy
kubectl krew install get-all
kubectl krew install kc
kubectl krew install konfig
kubectl krew install neat
kubectl krew install ns
kubectl krew install status
kubectl krew install view-cert
kubectl krew install whoami
```

## 安装其它工具

其它很多软件可能很多需要从 GitHub 获取最新 release 版本号、下载和编译等复杂操作，我们可以抽取一些公共函数和变量，单独放到一个脚本里执行：

```bash title="scripts/download-and-install.sh"
#!/bin/bash

set -ex

export GITHUB_TOKEN="****************************************"
export DEBIAN_FRONTEND=noninteractive
export PATH="$PATH:/opt/go/bin:/root/go/bin"
export PATH="$PATH:/root/.cargo/bin"
export ARCH=$(dpkg --print-architecture)
export ARCH2=$(arch)
export OS=$(uname | tr '[:upper:]' '[:lower:]')
export OS_UPPER=$(uname)

clean_tmp() {
	cd /tmp
	rm -rf /tmp/tmp
}

gotmp() {
	mkdir -p /tmp/tmp
	cd /tmp/tmp
}

getLatestRelease() {
	repo="$1"
	release=$(curl -s --header "Authorization: Bearer ${GITHUB_TOKEN}" "https://api.github.com/repos/${repo}/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
	echo "${release}"
}

# lazygit
gotmp
LAZYGIT_VERSION=$(getLatestRelease "jesseduffield/lazygit")
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_${OS_UPPER}_${ARCH2}.tar.gz"
tar xf lazygit.tar.gz lazygit
install lazygit /usr/local/bin
clean_tmp

# terraform
gotmp
TERRAFROM_VERSION=$(getLatestRelease "hashicorp/terraform")
curl -Lo terraform.zip https://releases.hashicorp.com/terraform/${TERRAFROM_VERSION}/terraform_${TERRAFROM_VERSION}_${OS}_${ARCH}.zip
unzip terraform.zip
install terraform /usr/local/bin
clean_tmp

# istioctl
gotmp
git clone --depth=1 https://github.com/istio/istio.git
cd istio/istioctl/cmd/istioctl
go build -o /usr/local/bin/istioctl
clean_tmp

# coscli
wget -O /usr/local/bin/coscli https://cosbrowser.cloud.tencent.com/software/coscli/coscli-linux
chmod +x /usr/local/bin/coscli

# buildctl
gotmp
wget -O buildkit.tar.gz https://github.com/moby/buildkit/releases/download/v0.12.2/buildkit-v0.12.2.${OS}-${ARCH}.tar.gz # CHANGE_VERSION
tar -zxvf buildkit.tar.gz
mv ./bin/buildctl /usr/local/bin/buildctl
mv ./bin/buildkitd /usr/local/bin/buildkitd
clean_tmp

# wrk
gotmp
git clone --depth=1 https://github.com/wg/wrk.git
cd wrk
make
cp wrk /usr/local/bin
clean_tmp

# ctr
gotmp
wget -O containerd.tar.gz https://github.com/containerd/containerd/releases/download/v1.6.22/containerd-1.6.22-${OS}-${ARCH}.tar.gz # CHANGE_VERSION
tar -zxvf containerd.tar.gz
mv ./bin/ctr /usr/local/bin/ctr
clean_tmp

# nerdctl
gotmp
wget -O nerdctl.tar.gz https://github.com/containerd/nerdctl/releases/download/v1.5.0/nerdctl-1.5.0-${OS}-${ARCH}.tar.gz # CHANGE_VERSION
tar -zxvf nerdctl.tar.gz
mv ./nerdctl /usr/local/bin/nerdctl
clean_tmp

# helm
gotmp
HELM_VERSION=$(getLatestRelease "helm/helm")
wget -O helm.tar.gz https://get.helm.sh/helm-v${HELM_VERSION}-${OS}-${ARCH}.tar.gz # CHANGE_VERSION
tar -zxf helm.tar.gz
mv ${OS}-${ARCH}/helm /usr/local/bin/helm
clean_tmp

# tree-sitter
gotmp
wget https://github.com/tree-sitter/tree-sitter/releases/latest/download/tree-sitter-${OS}-x64.gz
gunzip tree-sitter-${OS}-x64.gz
mv tree-sitter-${OS}-x64 /usr/local/bin/tree-sitter
chmod +x /usr/local/bin/tree-sitter
clean_tmp

# kn (knative cli)
wget -O /usr/local/bin/kn https://github.com/knative/client/releases/latest/download/kn-${OS}-${ARCH}
chmod +x /usr/local/bin/kn

# kfilt (https://github.com/ryane/kfilt)
wget -O /usr/local/bin/kfilt https://github.com/ryane/kfilt/releases/download/v0.0.8/kfilt_0.0.8_${OS}_${ARCH}
chmod +x /usr/local/bin/kfilt

# fzf
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install --bin

# skopeo: https://github.com/containers/skopeo/blob/main/install.md#building-from-source
apt install -y libgpgme-dev libassuan-dev libbtrfs-dev libdevmapper-dev pkg-config go-md2man
gotmp
SKOPEO_VERSION=$(getLatestRelease "containers/skopeo")
git clone --depth 1 --branch v${SKOPEO_VERSION} https://github.com/containers/skopeo.git # CHANGE_VERSION
cd skopeo
make
make install
clean_tmp

# aws
gotmp
curl "https://awscli.amazonaws.com/awscli-exe-${OS}-${ARCH2}.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
clean_tmp

# neovim
gotmp
git clone https://github.com/neovim/neovim.git
cd neovim
git checkout stable
make CMAKE_BUILD_TYPE=RelWithDebInfo
cd build
cpack -G DEB
dpkg -i nvim-linux64.deb
clean_tmp
# map vi to nvim
update-alternatives --remove-all vi
update-alternatives --install /usr/bin/vi vi $(which nvim) 1
# rest.nvim 插件的依赖：https://github.com/rest-nvim/rest.nvim
apt install -y tidy

# gitalias
curl https://raw.githubusercontent.com/GitAlias/gitalias/main/gitalias.txt -o $HOME/gitalias.txt
```

## Dockerfile 指令

```dockerfile title="Dockerfile"
# kubectl 及其插件
#
COPY ./scripts/kubectl.sh /run.sh
RUN /run.sh

# 下载和编译安装二进制
#
COPY ./scripts/download-and-install.sh /run.sh
RUN /run.sh
```
