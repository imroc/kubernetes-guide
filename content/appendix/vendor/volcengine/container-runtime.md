# VKE 的容器运行时

## 概述

本文基于 VKE v1.30 调研其容器运行时的情况。

## containerd systemd 配置

VKE 使用 containerd 作为容器运行时，使用 systemd 管理，service 配置如下：

```bash
root@iv-ye593xiz9c5i3z3kulq3:/etc/containerd# systemctl cat containerd
# /lib/systemd/system/containerd.service
# Copyright The containerd Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target var-lib-containerd.mount

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd

Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=1048576
# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
```

## containerd 配置

<FileBlock file="vendor/volcengine/containerd-config.toml" showLineNumbers title="/etc/containerd/config.toml" />

## containerd 版本

```bash
$ containerd --version
containerd github.com/containerd/containerd v1.6.38-vke.16 a05cd1efae5a1f9e6fa53e0d44c397e1fb7d5db3
```
