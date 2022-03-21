# IPVS no destination available

## 现象

内核日志不停报 `no destination available` 这样的 warning 日志，查看 dmesg:

```log
[23709.680898] IPVS: rr: TCP 192.168.0.52:80 - no destination available
[23710.709824] IPVS: rr: TCP 192.168.0.52:80 - no destination available
[23832.428700] IPVS: rr: TCP 127.0.0.1:30209 - no destination available
[23833.461818] IPVS: rr: TCP 127.0.0.1:30209 - no destination available
```