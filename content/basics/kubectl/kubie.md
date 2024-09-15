# 使用 kubie 优雅的管理多集群 kubeconfig

## 传统的方案：kubectx 与 kubens

如果你有很多 kubernetes 集群，经常需要切换集群来执行各种操作，如何方便的切换和管理呢？

传统的做法可能是将所有集群 kubeconfig 合并到同一个文件，然后利用 `kubectx`，`kubens` 这种 context 和 namespace 的切换工具方便的在各个集群和 namesapce 之间切换，这样可行，但有一些问题：
1. 所有 kubeconfig 合并到一起，维护起来比较麻烦。
2. 一些状态类也会记录到 kubeconfig，如当前 context 和当前命名空间，如果想将 kubeconfig 文件通过 git 在多个机器里同步，就不太合适。

## 更优雅的方案：kubie

[kubie](https://github.com/sbstp/kubie) 是一个 Rust 实现的 kubernetes 多集群管理工具，可发现指定目录下的所有 kubeconfig 文件，切换 context 时可选择任意 kubeconfig 中的集群，任意切换 ns，它不会修改 kubeconfig 文件，多个 shell 操作也互不干扰。

相比 `kubectx` 与 `kubens`，`kubie` 的好处是：
1. kubeconfig 文件可任意组织管理，维护起来更优雅。一般建议是一个集群一个 kubeconfig 文件，用文件名作为集群名称（kubie ctx 选择集群时，使用去除后缀的文件名作为集群名）。
2. kubie 不会去修改 kubeconfig 文件，方便将 kubeconfig 使用 git 管理，在多个机器中同步。
3. 不同 shell 操作不同集群，互不干扰，提高效率。

## 安装 kubie

kubie 的安装可参考 [官方文档: Installation](https://github.com/sbstp/kubie?tab=readme-ov-file#installation)。

由于我的环境都有 Rust 环境，所以直接用 cargo 安装：

```bash
cargo install kubie
```

如果你用 MacOS，也可以直接用 brew 安装：

```bash
brew install kubie
```

## 配置自动补全

kubie 的自动补全可参考 [官方文档: Autocompletion](https://github.com/sbstp/kubie?tab=readme-ov-file#autocompletion)。

我使用的 fish shell，所以直接拷贝 `completion/kubie.fish` 到 `~/.config/fish/completions/kubie.fish` 即可。

## 管理 kubeconfig 文件

我是将自己用到的配置文件都使用 `dotfiles` 私有 git 仓库进行管理和同步，其中 kubeconfig 文件保存到 `dotfiles` 仓库下的 `kube` 目录:

```bash
$ tree dotfiles -P 'kube|kube/configs' --matchdirs --prune
dotfiles
└── kube
    ├── configs
    │   ├── dev.yaml
    │   ├── home.yaml
    │   ├── router.yaml
    │   ├── tke.yaml
    │   └── us.yaml
    └── kubie.yaml
```

`kubie` 的配置以及 kubeconfig 文件列表可以软连到 `~/.kube` 目录下，参考脚本：

```bash
link_file() {
  local src=$(realpath "$1") dst="$2"
  local dst_parent_dir="$(dirname "$dst")"
  mkdir -p "$dst_parent_dir"
  if [ -L "$dst" ]; then                       # already linked
    if [ "$(readlink "$dst")" = "$src" ]; then # already linked to the same file, ignore
      return
    fi
    echo "$dst is linked to $(readlink "$dst"), but expected $src, so remove it"
    rm "$dst" # wrong link, remove it
  elif [ -e "$dst" ]; then
    if [ "$FORCE_LINK" = "1" ]; then
      echo "override $dst"
      rm -rf "$dst"
    else
      echo "$dst is already existed, skip"
      return
    fi
  fi

  echo "link $src --> $dst"
  ln -s "$src" "$dst"
}

link_children() {
  local src_dir=$(realpath $1) dst_dir=$2
  if [ ! -d "$src_dir" ]; then
    echo "$src_dir is not a direcotry"
    return
  fi
  mkdir -p "$dst_dir"
  for i in $(ls -A "$src_dir"); do
    link_file "$src_dir/$i" "$dst_dir/$i"
  done
}

link_children "kube" "$HOME/.kube"
```

## kubie 用法

切换 context:

```bash
kubie ctx
```

切换 namespace:

```bash
kubie ns
```

使用效果:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F09%2F15%2F20240915180452.gif)

我一般使用 alias（使用实在太高频，不想多敲键盘）:

```bash
alias kx="kubie ctx"
alias kns="kubie ns"
```
