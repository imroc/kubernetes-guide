# SSH 配置
## 配置文件目录结构

SSH 相关的配置都在 `/etc/ssh` 这个目录下，建议是先用容器安装一下 ssh，然后将 `/etc/ssh` 目录下的配置都拷贝出来。

`sshd_config` 是主要配置文件，其余是自动生成的公钥和密钥文件：

```txt
config
└── after
    └── etc
        └── ssh
            ├── sshd_config
            ├── ssh_host_ecdsa_key
            ├── ssh_host_ecdsa_key.pub
            ├── ssh_host_ed25519_key
            ├── ssh_host_ed25519_key.pub
            ├── ssh_host_rsa_key
            └── ssh_host_rsa_key.pub
```

为什么要将自动生成的公钥和密钥也放进来？因为不希望每次编译镜像都生成新的公钥和密钥，这样每次编译后 SSH 的公钥和密钥有变化，重新 SSH 登录时，会报错，需要清理本机 `~/.ssh/known_hosts` 对应的记录才能正常登录。 当然你也可以修改本地 SSH 配置，加上 `StrictHostKeyChecking no` 的选项也能登录上去，每次还是会有警告提示，有强迫症的用户受不了。

## 修改 sshd_config

`sshd_config` 中最关键的配置是修改打开端口号，默认是 22，修改成其它端口避免与宿主机 SSH 端口冲突：

```txt title="config/after/etc/ssh/sshd_config"
Port 36001
```
