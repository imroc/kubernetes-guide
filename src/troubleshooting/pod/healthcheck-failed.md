# 排查健康检查失败

* Kubernetes 健康检查包含就绪检查(readinessProbe)和存活检查(livenessProbe)
* pod 如果就绪检查失败会将此 pod ip 从 service 中摘除，通过 service 访问，流量将不会被转发给就绪检查失败的 pod
* pod 如果存活检查失败，kubelet 将会杀死容器并尝试重启

健康检查失败的可能原因有多种，除了业务程序BUG导致不能响应健康检查导致 unhealthy，还能有有其它原因，下面我们来逐个排查。

## 健康检查配置不合理

`initialDelaySeconds` 太短，容器启动慢，导致容器还没完全启动就开始探测，如果 successThreshold 是默认值 1，检查失败一次就会被 kill，然后 pod 一直这样被 kill 重启。

## 节点负载过高

cpu 占用高（比如跑满）会导致进程无法正常发包收包，通常会 timeout，导致 kubelet 认为 pod 不健康。参考 [排查节点高负载](../node/node-high-load.md) 。

## 容器进程被木马进程杀死

参考 [使用 systemtap 定位疑难杂症](../skill/kernel/use-systemtap-to-locate-problems.md) 进一步定位。

## 容器内进程端口监听挂掉

使用 `netstat -tunlp` 检查端口监听是否还在，如果不在了，抓包可以看到会直接 reset 掉健康检查探测的连接:

```bash
20:15:17.890996 IP 172.16.2.1.38074 > 172.16.2.23.8888: Flags [S], seq 96880261, win 14600, options [mss 1424,nop,nop,sackOK,nop,wscale 7], length 0
20:15:17.891021 IP 172.16.2.23.8888 > 172.16.2.1.38074: Flags [R.], seq 0, ack 96880262, win 0, length 0
20:15:17.906744 IP 10.0.0.16.54132 > 172.16.2.23.8888: Flags [S], seq 1207014342, win 14600, options [mss 1424,nop,nop,sackOK,nop,wscale 7], length 0
20:15:17.906766 IP 172.16.2.23.8888 > 10.0.0.16.54132: Flags [R.], seq 0, ack 1207014343, win 0, length 0
```

连接异常，从而健康检查失败。发生这种情况的原因可能在一个节点上启动了多个使用 `hostNetwork` 监听相同宿主机端口的 Pod，只会有一个 Pod 监听成功，但监听失败的 Pod 的业务逻辑允许了监听失败，并没有退出，Pod 又配了健康检查，kubelet 就会给 Pod 发送健康检查探测报文，但 Pod 由于没有监听所以就会健康检查失败。

## SYN backlog 设置过小

SYN backlog 大小即 SYN 队列大小，如果短时间内新建连接比较多，而 SYN backlog 设置太小，就会导致新建连接失败，通过 `netstat -s | grep TCPBacklogDrop` 可以看到有多少是因为 backlog 满了导致丢弃的新连接。

如果确认是 backlog 满了导致的丢包，建议调高 backlog 的值，内核参数为 `net.ipv4.tcp_max_syn_backlog`。
