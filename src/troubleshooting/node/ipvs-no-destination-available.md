# IPVS no destination available

## 现象

内核日志不停报 `no destination available` 这样的 warning 日志，查看 dmesg:

```log
[23709.680898] IPVS: rr: TCP 192.168.0.52:80 - no destination available
[23710.709824] IPVS: rr: TCP 192.168.0.52:80 - no destination available
[23832.428700] IPVS: rr: TCP 127.0.0.1:30209 - no destination available
[23833.461818] IPVS: rr: TCP 127.0.0.1:30209 - no destination available
```

## 原因

一般是因为有 Service 用了 `externalTrafficPolicy:Local`，当 Node 上没有该 Service 对应 Pod 时，Node 上的该 Service 对应 NodePort 的 IPVS 规则里，RS 列表为空。当有流量打到这个 Node 的对应 NodePort 上时，由于 RS 列表为空，内核就会报这个 warning 日志。

在云厂商托管的 K8S 服务里，通常是 LB 会去主动探测 NodePort，发到没有这个 Service 对应 Pod 实例的 Node 时，报文被正常丢弃，从而内核报 warning 日志。

这个日志不会对服务造成影响，可以忽略不管。如果是在腾讯云 TKE 环境里，并且用的 TencentOS，可以设置一个内核参数来抑制这个 warning 日志输出:

```bash
sysctl -w net.ipv4.vs.ignore_no_rs_error=1
```

## 参考资料

* Kubernetes Issue: [IPVS error log occupation with externalTrafficPolicy: Local option in Service](https://github.com/kubernetes/kubernetes/issues/100925)