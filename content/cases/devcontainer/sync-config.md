# 使用 Git 同步可变配置

## 概述

对于日常开发，很多配置是经常发生变化的，比如编辑器的配置、`.zshrc` 里的配置以及其它各种常用的工具的配置。这部分不适合在构建镜像时拷贝到镜像中，应该将每个软件的配置单独用私有 Git 仓库来保存和同步，本文介绍具体同步方法。

## sync-config 脚本

可以准备一个自己专用的同步配置的脚本，该脚本自身也需要用 Git 来同步，不能写死，比如我将的私有仓库是 `git@gitee.com:imroc/denv.git`，在下面有一个 `sync-config.sh` 脚本用于同步所有配置：

```bash title="sync-config.sh"
#!/bin/bash

set -e

declare -A repos
repos["$HOME/.zsh"]="git@gitee.com:imroc/zsh-config.git"
repos["$HOME/.config/nvim"]="git@gitee.com:imroc/neovim-config.git"
repos["$HOME/.config/k9s"]="git@gitee.com:imroc/k9s-config.git"
repos["$HOME/.config/zellij"]="git@gitee.com:imroc/zellij-config.git"
repos["$HOME/.config/kubeschemas"]="git@gitee.com:imroc/kubeschemas.git"
repos["$HOME/.config/lazygit"]="git@gitee.com:imroc/lazygit-config.git"
repos["$HOME/denv"]="git@gitee.com:imroc/denv.git"

ensure_git() {
	filepath=$1
	repo=$2
	echo "sync $filepath"
	# 空目录(可能是显式挂载)或者不存在，clone配置仓库
	if [ -d $filepath ]; then
		if [ -z "$(ls -A $filepath)" ]; then
			cd $filepath
			git clone --depth=1 --recurse-submodules $repo .
			cd -
		else
			cd $filepath
			git pull --recurse-submodules
			cd $filepath
		fi
	else
		git clone --depth=1 --recurse-submodules $repo $filepath
	fi
}

# 确保声明的仓库被同步到指定目录
for filepath in "${!repos[@]}"; do
	repo=${repos[$filepath]}
	ensure_git $filepath $repo
done

# oh-my-zsh 及其自定义配置较特殊，用单独的判断逻辑来同步
dir="$HOME/.oh-my-zsh"
if [ ! -d $dir ]; then
	mkdir -p $dir
fi
cd $dir
echo "sync $dir"
if ! git rev-parse --is-inside-work-tree 2>&1 >/dev/null; then
	git clone --depth=1 --recurse-submodules https://github.com/ohmyzsh/ohmyzsh.git .
	rm -rf custom
	git clone --depth=1 --recurse-submodules https://gitee.com/imroc/custom-ohmyzsh.git custom
	cd -
	cd $dir/custom
	make update
	cd -
else
	cd -
	dir="$HOME/.oh-my-zsh/custom"
	cd $dir
	echo "sync $dir"
	git pull --recurse-submodules
	cd -
fi
```

私有仓库的 Makefile 中也会引用该脚本：

```bash title="Makefile"
sync-config:
	bash sync-config.sh
```
## 容器内 rc.local 开机脚本

富容器的主进程是 systemd，启动时会执行 `/etc/rc.local` 中的开机脚本，我们在开机脚本中调用下 `init-root`:

```bash title="/etc/rc.local"
#!/bin/bash

set -ex
echo "start rc.local" >>/var/log/rclocal.log
init-root
echo "end rc.local" >>/var/log/rclocal.log
exit 0
```

`init-root` 又是容器内 `/usr/local/bin/init-root` 这个脚本文件，内容是：

```bash
#!/bin/sh

chmod 0700 /root

if [ -z "$(ls -A /root)" ]; then
	echo "init root directory"
	cp -rf /root.bak/. /root
	git clone --depth 1 git@gitee.com:imroc/denv.git $HOME/denv
	cd $HOME/denv
	make sync-config
	cd -
fi
```

目的有两个：
1. 如果 root 目录是空的，就将镜像中对 root 目录的备份拷进去（因为容器的root是挂载的宿主机中的`/data/root`目录，一开始是空的）。
2. 下载初始化 sync-config 脚本并执行，将其它应用依赖的配置拷贝到相应的路径。

## 关于 .zshrc

zsh 的配置比较特殊，它并没有在 `~/.config` 下，而是直接在 HOME 目录下，我们可以容器内固定使用以下 `.zshrc`:

```bash
if [[ -z "$ZELLIJ" ]]; then
    zellij attach -c main
fi

[[ ! -f ~/.zsh/init.sh ]] || source ~/.zsh/init.sh

[[ ! -f ~/.aliases ]] || source ~/.aliases
```

该 `.zshrc` 会引用我们 Git 同步过来的 .zshrc 脚本并执行 (`~/.zsh` 目录下的脚本)。

`.zshenv` 也类似：

```bash
[[ ! -f ~/.zsh/env.sh ]] || source ~/.zsh/env.sh

# zsh-autocomplete's special setting for ubuntu
# see https://github.com/marlonrichert/zsh-autocomplete#additional-step-for-ubuntu
skip_global_compinit=1
```
