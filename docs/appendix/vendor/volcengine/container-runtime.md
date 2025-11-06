# VKE 的容器运行时

## 概述

本文分析 VKE 的容器运行时（基于 VKE v1.30）。

VKE 使用 containerd 作为容器运行时，以下是具体分析。

## containerd systemd 配置

<FileBlock file="vendor/volcengine/containerd.service" showLineNumbers title="/lib/systemd/system/containerd.service" language="systemd" />

## containerd 配置

<FileBlock file="vendor/volcengine/containerd-config.toml" showLineNumbers title="/etc/containerd/config.toml" />

## containerd 版本

```bash
$ containerd --version
containerd github.com/containerd/containerd v1.6.38-vke.16 a05cd1efae5a1f9e6fa53e0d44c397e1fb7d5db3
```
