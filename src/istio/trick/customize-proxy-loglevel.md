# 自定义 proxy 日志级别

## 概述

本文介绍在 istio 中如何自定义数据面 (proxy) 的日志级别，方便我们排查问题时进行调试。

## 动态调整

调低 proxy 日志级别进行 debug 有助于排查问题，但输出内容较多且耗资源，不建议在生产环境一直开启低级别的日志，istio 默认使用 `warning` 级别。

我们可以使用 istioctl 动态调整 proxy 日志级别:

```bash
istioctl -n istio-test proxy-config log productpage-v1-7668cb67cc-86q8l --level debug
```

还可以更细粒度控制:

```bash
istioctl -n istio-test proxy-config log productpage-v1-7668cb67cc-86q8l --level grpc:trace,config:debug
```

> 更多 level 可选项参考: `istioctl proxy-config log --help`

如果没有 istioctl，也可以直接使用 kubectl 进入 istio-proxy 调用 envoy 接口来动态调整:

```bash
kubectl exec -n istio-test  productpage-v1-7668cb67cc-86q8l -c istio-proxy -- curl -XPOST -s -o /dev/null http://localhost:15000/logging?level=debug
```

## 使用 annotation 指定

如果不用动态调整，也可以在部署时为 Pod 配置 annotation 来指定 proxy 日志级别:

```yaml
  template:
    metadata:
      annotations:
        "sidecar.istio.io/logLevel": debug # 可选: trace, debug, info, warning, error, critical, off
```

## 全局配置

如果是测试集群，你也可以全局配置 proxy 日志级别:

```bash
kubectl -n istio-system edit configmap istio-sidecar-injector
```

修改 `values` 里面的 `global.proxy.logLevel`  字段即可。

如果使用 istioctl 安装 istio，也可以使用类似以下命令配置全局 proxy 日志级别:

```bash
istioctl install --set profile=demo --set values.global.proxy.logLevel=debug
```

## 配置 envoy componentLogLevel

如何细粒度的调整 envoy 自身的内部日志级别呢？可以给 Pod 指定 annotation 来配置:

```yaml
  template:
    metadata:
      annotations:
        "sidecar.istio.io/componentLogLevel": "ext_authz:trace,filter:debug"
```

* [Envoy component logging 说明](https://www.envoyproxy.io/docs/envoy/latest/operations/cli#cmdoption-component-log-level)
* 该配置最终会作为 envoy 的 `--component-log-level` 启动参数。