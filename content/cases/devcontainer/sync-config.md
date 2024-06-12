# 使用 Git 同步可变配置

## 概述

对于日常开发，很多软件的配置是经常发生变化的，这部分不适合在构建镜像时拷贝到镜像中，可以使用私有 Git 仓库来保存和同步，本文介绍具体同步方法。

## dotfiles 仓库

现代的软件配置都遵循 [XDG 规范](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) ，配置文件基本默认都在 `$HOME/.config` 这个目录下，我们可以将该目录使用 Git 来同步，让本机和远程富容器内共享应用配置。

`$HOME/.config` 这个目录可能会有一些应用自动生成的配置或临时文件，但是我们不希望将其同步，只希望同步指定的一些目录和关键，此时可以用 `.gitignore` 来忽略掉这些文件，比如:

```gitignore
*
!/fish**
!.gitignore
!Makefile
!README.md
!/hack**
!/gh**
!/helm**
!/k9s**
!/kubeschemas**
!/lazygit**
!/nvim**
!/omf**
!/starship**
!/tmux**
!/zellij**
!/wezterm**
!/vscode**
```

> 第一行表示忽略所有文件，后面 `!` 开头的则表示 XX 除外的意思，即达到 “只同步指定文件和目录” 的效果。

## sync-config 脚本

可以准备一个自己专用的同步配置的脚本，并加到 alias 进行执行，方便日常需要同步配置时一键同步，比如脚本文件 `$HOME/.config/hack/sync-config.sh`:

```bash title="sync-config.sh"
#!/bin/bash

set -e

declare -A repos
repos["$HOME/.config"]="git@gitee.com:imroc/dotfiles.git"

ensure_git() {
	filepath=$1
	repo=$2
	echo "sync $filepath"
	if [ -d $filepath ]; then
		if [ -z "$(ls -A $filepath)" ]; then # 空目录(可能是显式挂载)或者不存在，clone配置仓库
			cd $filepath
			git clone --depth=1 --recurse-submodules $repo .
			cd -
		else
			cd $filepath
			if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then # 已经是 Git 目录了，直接 pull 即可
				git pull --recurse-submodules
				cd -
			else # 不是 Git 目录，先删除，再 clone
				cd -
				rm -rf $filepath
				git clone --depth=1 --recurse-submodules $repo $filepath
			fi
		fi
	else
		git clone --depth=1 --recurse-submodules $repo $filepath # 目录不存在，clone 配置仓库
	fi
}

# 确保声明的仓库被同步到指定目录
for filepath in "${!repos[@]}"; do
	repo=${repos[$filepath]}
	ensure_git $filepath $repo
done
```

> 注意替换仓库地址。

alias 配置：

```bash
alias sync-config="bash $HOME/.config/hack/sync-config.sh"
```

> 我用的 fish shell，fish 相关配置在 `$HOME/.config/fish` 下，我的这条 alias 加在 `$HOME/.config/fish/conf.d/common-aliases.fish` 中。

后续如果需要同步配置，直接在命令行执行 `sync-config` 即可。

## 容器内 rc.local 开机脚本

富容器的主进程是 systemd，可以启用 rc-local 服务：

```systemd title="/lib/systemd/system/rc-local.service"
#  SPDX-License-Identifier: LGPL-2.1-or-later
#
#  This file is part of systemd.
#
#  systemd is free software; you can redistribute it and/or modify it
#  under the terms of the GNU Lesser General Public License as published by
#  the Free Software Foundation; either version 2.1 of the License, or
#  (at your option) any later version.

# This unit gets pulled automatically into multi-user.target by
# systemd-rc-local-generator if /etc/rc.local is executable.
[Unit]
Description=/etc/rc.local Compatibility
Documentation=man:systemd-rc-local-generator(8)
ConditionFileIsExecutable=/etc/rc.local
After=network.target

[Service]
Type=forking
ExecStart=/etc/rc.local start
TimeoutSec=0
RemainAfterExit=yes
GuessMainPID=no

[Install]
WantedBy=multi-user.target
```

这样容器启动时会执行 `/etc/rc.local` 中的开机脚本，我们在开机脚本中调用下 `init-root`:

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
