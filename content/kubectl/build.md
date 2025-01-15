# 自行编译 kubectl

如果对 kubectl 有些特殊需求，进行了二次开发，可通过下面的方式编译：

```bash
make kubectl KUBE_BUILD_PLATFORMS=darwin/arm64
```

- `KUBE_BUILD_PLATFORMS` 指定要编译的目标平台。
