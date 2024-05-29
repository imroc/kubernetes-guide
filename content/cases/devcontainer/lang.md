# 安装开发语言环境

## 脚本组织方法

日常可能用到的开发语言环境，以及部分语言包管理所需要安装的软件，每种语言都可以单独用一个脚本文件来维护：

```txt
scripts
└── lang
    ├── c-cpp.sh
    ├── go.sh
    ├── java.sh
    ├── julia.sh
    ├── lua.sh
    ├── nodejs.sh
    ├── php.sh
    ├── python.sh
    ├── ruby.sh
    └── rust.sh
```

## Dockerfile 指令

在 `Dockerfile` 中挨个将语言相关的脚本拷进去执行：

```dockerfile
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
```

## 脚本文件示例
### C/C++

```bash title="scripts/lang/c-cpp.sh"
#!/bin/bash

set -ex

apt install -y gcc g++ clang libclang-dev
```

### Go

```bash title="scripts/lang/go.sh"
#!/bin/bash

set -ex

# golang
curl -L https://git.io/vQhTU | GOROOT=/opt/go bash -s -- --version 1.22.2 # CHANGE_VERSION

export PATH="$PATH:/opt/go/bin:/root/go/bin"

CGO_ENABLED=0 go install -ldflags='-s -w -extldflags=-static' github.com/go-delve/delve/cmd/dlv@latest # 静态编译dlv，方便拷贝到容器内进行远程调试
go install github.com/bazelbuild/bazelisk@latest && mv /root/go/bin/bazelisk /root/go/bin/bazel
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
go install github.com/rakyll/hey@latest
go install fortio.org/fortio@latest
go install go.k6.io/k6@latest
go install github.com/antonmedv/fx@latest
# protobuf and grpc
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
# formatting bazel BUILD and .bzl files
go install github.com/bazelbuild/buildtools/buildifier@latest
# hugo
go install -tags extended github.com/gohugoio/hugo@latest
# kustomize
go install sigs.k8s.io/kustomize/kustomize/v5@latest
# k9s
go install github.com/derailed/k9s@latest
# yaml2json
go install github.com/bronze1man/yaml2json@latest
# cfssl
go install github.com/cloudflare/cfssl/cmd/cfssl@latest
# regols
go install github.com/kitagry/regols@latest
# crd-ref-docs
go install github.com/elastic/crd-ref-docs@latest
# gocrane and crane
go install github.com/google/go-containerregistry/cmd/gcrane@latest
go install github.com/google/go-containerregistry/cmd/crane@latest
# envsubst
go install github.com/a8m/envsubst/cmd/envsubst@latest
# jb
go install github.com/jsonnet-bundler/jsonnet-bundler/cmd/jb@latest
# go-jsonnet
go install github.com/google/go-jsonnet/cmd/jsonnet@latest
go install github.com/google/go-jsonnet/cmd/jsonnet-lint@latest
```

### Java

```bash title="scripts/lang/java.sh"
#!/bin/bash

set -ex

export DEBIAN_FRONTEND=noninteractive

# java
apt install -y openjdk-21-jdk # CHANGE_VERSION
apt install -y maven

# gradle
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install gradle 8.7 # CHANGE_VERSION
```

### Julia

```bash title="scripts/lang/julia.sh"
#!/bin/bash

set -ex

pip install jill -U --break-system-packages
jill install -c
```

### Lua

```bash title="scripts/lang/lua.sh"
#!/bin/bash

set -ex

clean_tmp() {
	cd /tmp
	rm -rf /tmp/tmp
}

gotmp() {
	mkdir -p /tmp/tmp
	cd /tmp/tmp
}

# lua https://www.lua.org/ftp/
LUA_VERSION="5.4.6"
gotmp
curl -R -O https://www.lua.org/ftp/lua-$LUA_VERSION.tar.gz
tar -zxf lua-*.tar.gz
rm -f lua-*.tar.gz
cd lua-*
make linux test
make install
clean_tmp

# luarocks http://luarocks.github.io/luarocks/releases/
LUAROCKS_VERSION="3.11.0"
gotmp
wget -O luarocks.tar.gz http://luarocks.github.io/luarocks/releases/luarocks-$LUAROCKS_VERSION.tar.gz # CHANGE_VERSION
tar -zxf luarocks.tar.gz
cd luarocks-*
./configure --with-lua-include=/usr/local/include
make
make install
clean_tmp
```

### NodeJS

```bash title="scripts/lang/nodejs.sh"
#!/bin/bash

set -ex

# nodejs https://github.com/nodesource/distributions?tab=readme-ov-file#installation-instructions
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# npm install
npm install -g husky
npm install -g yarn
npm install -g @ohos/hpm-cli

# neovim 依赖
npm install -g neovim
```

### PHP

```bash title="scripts/lang/php.sh"
#!/bin/bash

set -ex

# php
apt install -y php php-fpm php-all-dev composer
```

### Python

```bash title="scripts/lang/python.sh"
#!/bin/bash

set -ex

# python
apt install -y python3-full python3-pip python-is-python3
pip install virtualenv --break-system-packages

# tccli (https://cloud.tencent.com/document/product/440/34011)
pip install --no-input tccli --break-system-packages
# kube-shell (https://github.com/cloudnativelabs/kube-shell#installation)
pip install --no-input kube-shell --break-system-packages
# hg
pip install --no-input --upgrade mercurial --break-system-packages

# repo 命令 (https://help.gitee.com/enterprise/code-manage/%E9%9B%86%E6%88%90%E4%B8%8E%E7%94%9F%E6%80%81/Repo%20%E5%B7%A5%E5%85%B7%E4%BD%BF%E7%94%A8%E4%BB%8B%E7%BB%8D)
curl https://gitee.com/oschina/repo/raw/fork_flow/repo-py3 >/usr/local/bin/repo
chmod a+x /usr/local/bin/repo
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple requests --break-system-packages

# neovim 依赖
pip install --no-input neovim --break-system-packages
# nvim 的 pastify.nvim 插件的依赖：https://github.com/TobinPalmer/pastify.nvim
pip install --no-input pillow --break-system-packages
```

### Ruby

```bash title="scripts/lang/ruby.sh"
#!/bin/bash

set -ex

# ruby
apt install -y ruby-full

# nvim 的 ruby 依赖
gem install neovim
```

### Rust

```bash title="scripts/lang/rust.sh"
#!/bin/bash

set -ex

# rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y

# cargo install
export PATH="$PATH:/root/.cargo/bin"

cargo install zoxide --locked
cargo install deno --locked
cargo install procs
cargo install mdbook
cargo install tealdeer
cargo install fd-find
cargo install ripgrep
cargo install skim
cargo install zellij --locked
```
