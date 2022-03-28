# httpHeaderName 大写导致会话保持不生效

## 问题描述

在 DestinationRule 中配置了基于 http header 的会话保持，header 名称大写:

```yaml
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: User
```

测试会发现会话保持不生效，每次请求传入相同 Header (如 `User: roc`) 却被转发了不同后端

## 原因

应该是 envoy 默认把 header 转成小写的缘故导致不生效。

## 解决方案

定义 `httpHeaderName` 时换成小写，如:

```yaml
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: User
```

## 注意事项

* 如果之前已经定义了 DestinationRule，不要直接修改，而是先删除，然后再创建修改后的 DestinationRule (实测发现直接修改成可能不生效)
* 客户端请求时设置的 header 大小写可以无所谓。