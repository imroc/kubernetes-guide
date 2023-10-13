# 使用 wireshark 分析数据包

## 分析 DNS 异常

### 找出没有收到响应的 dns 请求

```txt
dns && (dns.flags.response == 0) && ! dns.response_in
```

### 根据 dns 请求 id 过滤

```txt
dns.id == 0xff0b
```

### 找出慢响应

超过 100 ms 的响应:

```txt
dns.flags.rcode eq 0 and dns.time gt .1
```

### 过滤 NXDomain 的响应

所有 `No such name` 的响应:

```txt
dns.flags.rcode == 3
```

排除集群内部 service:

```txt
((dns.flags.rcode == 3) && !(dns.qry.name contains ".local") && !(dns.qry.name contains ".svc") && !(dns.qry.name contains ".cluster"))
```

指定某个外部域名:

```txt
((dns.flags.rcode == 3) && (dns.qry.name == "imroc.cc")
```

## 分析 TCP 异常

### 找出连接超时的请求

客户端连接超时，如果不是因为 dns 解析超时，那就是因为 tcp 握手超时了，通常是服务端没响应 SYNACK 或响应太慢。

超时的时候客户端一般会发 RST 给服务端，过滤出握手超时的包:

```txt
(tcp.flags.reset eq 1) and (tcp.flags.ack eq 0)
```

过滤出服务端握手时响应 SYNACK 慢的包:

```txt
tcp.flags eq 0x012 && tcp.time_delta gt 0.0001
```

还可以将 `Time since previous frame in this TCP stream` 添加为一列:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925152342.png)

点击列名降序排列可查出慢包 (可加更多条件过滤调不需要希望展示的包):

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925152349.png)

找出可疑包后使用 `Conversation Filter` 过滤出完整连接的完整会话内容:

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925152358.png)
