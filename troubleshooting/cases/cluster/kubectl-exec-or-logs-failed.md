# kubectl 执行 exec 或 logs 失败

## 原因

通常是 `kube-apiserver` 到 `kubelet:10250` 之间的网络不通，10250 是 kubelet 提供接口的端口，`kubectl exec` 和 `kubectl logs` 的原理就是 apiserver 调 kubelet，kubelet 再调运行时 (比如 dockerd) 来实现的。

## 解决方案

保证 kubelet 10250 端口对 apiserver 放通。

检查防火墙、iptables 规则是否对 10250 端口或某些 IP 进行了拦截。
