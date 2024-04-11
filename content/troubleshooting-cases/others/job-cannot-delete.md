# Job 无法被删除

## 原因

* 可能是 k8s 的一个bug: [https://github.com/kubernetes/kubernetes/issues/43168](https://github.com/kubernetes/kubernetes/issues/43168)
* 本质上是脏数据问题，Running+Succeed != 期望Completions 数量，低版本 kubectl 不容忍，delete job 的时候打开debug(加-v=8)，会看到kubectl不断在重试，直到达到timeout时间。新版kubectl会容忍这些，删除job时会删除关联的pod

## 解决方法

1. 升级 kubectl 版本，1.12 以上
2. 低版本 kubectl 删除 job 时带 `--cascade=false` 参数\(如果job关联的pod没删完，加这个参数不会删除关联的pod\)

```bash
kubectl delete job --cascade=false  <job name>
```
