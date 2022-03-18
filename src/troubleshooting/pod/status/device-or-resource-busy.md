# 排查 device or resource busy

## 背景

在 kubernetes 环境中，可能会遇到因目录被占用导致 pod 一直 terminating:

```log
Aug 27 15:52:22 VM-244-70-centos kubelet[906978]: E0827 15:52:22.816125  906978 nestedpendingoperations.go:270] Operation for "\"kubernetes.io/secret/b45f3af4-3574-472e-b263-c2b71c3b2ea0-default-token-fltdk\" (\"b45f3af4-3574-472e-b263-c2b71c3b2ea0\")" failed. No retries permitted until 2021-08-27 15:54:24.816098325 +0800 CST m=+108994.575932846 (durationBeforeRetry 2m2s). Error: "UnmountVolume.TearDown failed for volume \"default-token-fltdk\" (UniqueName: \"kubernetes.io/secret/b45f3af4-3574-472e-b263-c2b71c3b2ea0-default-token-fltdk\") pod \"b45f3af4-3574-472e-b263-c2b71c3b2ea0\" (UID: \"b45f3af4-3574-472e-b263-c2b71c3b2ea0\") : unlinkat /var/lib/kubelet/pods/b45f3af4-3574-472e-b263-c2b71c3b2ea0/volumes/kubernetes.io~secret/default-token-fltdk: device or resource busy"
```

本文记录下排查方法。

## 找出目录被谁占用的

看下目录哪个进程 mount 了:

```bash
$ find /proc/*/mounts -exec grep /var/lib/kubelet/pods/0104ab85-d0ea-4ac5-a5f9-5bdd12cca589/volumes/kubernetes.io~secret/kube-proxy-token-nvthm {} + 2>/dev/null
/proc/6076/mounts:tmpfs /var/lib/kubelet/pods/0104ab85-d0ea-4ac5-a5f9-5bdd12cca589/volumes/kubernetes.io~secret/kube-proxy-token-nvthm tmpfs rw,relatime 0 0
```

根据找出的进程号，看看是谁干的:

```bash
$ ps -ef | grep -v grep | grep 6076
root        6076    6057  0 Aug26 ?        00:01:54 /usr/local/loglistener/bin loglistener -c /usr/local/loglistener/etc/loglistener.conf
```

看下完整的进程树:

```bash
$ pstree -apnhs 6076
systemd,1 --switched-root --system --deserialize 22
  └─dockerd,1809 --config-file=/etc/docker/daemon.json
      └─docker-containe,1868 --config /var/run/docker/containerd/containerd.toml
          └─docker-containe,6057 -namespace moby -workdir /data/docker/containerd/daemon/io.containerd.runtime.v1.linux/moby/9a8457284ce7078ef838e78b79c87c5b27d8a6682597b44ba7a74d7ec6965365 -address /var/run/docker/containerd/docker-containerd.sock -containerd-binary /usr/bin/docker-containerd -runtime-root ...
              └─loglistener,6076 loglistener -c /usr/local/loglistener/etc/loglistener.conf
                  ├─{loglistener},6108
                  ├─{loglistener},6109
                  ├─{loglistener},6110
                  ├─{loglistener},6111
                  └─{loglistener},6112
```

## 反查 Pod

如果占住这个目录的进程也是通过 Kubernetes 部署的，我们可以反查出是哪个 Pod 干的。

通过 nsenter 进入容器的 netns，查看 ip 地址，反查出是哪个 pod:

```bash
$ nsenter -n -t 6076
$ ip a 
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default 
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 10000
    link/ether 52:54:00:ca:89:c0 brd ff:ff:ff:ff:ff:ff
    inet 192.168.244.70/24 brd 192.168.244.255 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::5054:ff:feca:89c0/64 scope link 
       valid_lft forever preferred_lft forever
$ kubectl get pod -o wide -A | grep 192.168.244.70
log-agent-24nn6                                      2/2     Running            0          84d     192.168.244.70    10.10.10.22    <none>           <none>
```

如果 pod 是 hostNetwork 的，无法通过 ip 来分辨出是哪个 pod，可以提取进程树中出现的容器 id 前几位，然后查出容器名:

```bash
$ docker ps | grep 9a8457284c
9a8457284ce7        imroc/loglistener     "/usr/local/logliste…"   34 hours ago        Up 34 hours                             k8s_loglistener_log-agent-wd2rp_kube-system_b0dcfe14-1619-43b5-a158-1e2063696138_1
```

Kubernetes 的容器名就可以看出该容器属于哪个 pod。

