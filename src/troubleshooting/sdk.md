# SDK 排障

## python SDK 报证书 hostname 不匹配

使用 kubernetes 的 [python SDK](https://github.com/kubernetes-client/python)，报错:

```txt
hostname '10.10.36.196' doesn't match either of 'cls-bx5o9kt5-apiserver-service', 'kubernetes', 'kubernetes.default', 'kubernetes.default.svc', 'kubernetes.default.svc.cluster.local', 'localhost'
```

一般原因是 python 的依赖包版本不符合要求，主要关注:
* urllib3>=1.24.2
* ipaddress>=1.0.17

参考 [官方文档说明](https://github.com/kubernetes-client/python/blob/master/README.md#hostname-doesnt-match)。