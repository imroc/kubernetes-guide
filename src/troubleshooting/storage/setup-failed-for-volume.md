# MountVolume.SetUp failed for volume

## failed to sync secret cache: timed out waiting for the condition

Pod 报如下的 warning 事件:

```txt
Events:
  Type     Reason                  Age                    From                     Message
  ----     ------                  ----                   ----                     -------
  Warning  FailedMount             41m                    kubelet                  MountVolume.SetUp failed for volume "default-token-bgg5p" : failed to sync secret cache: timed out waiting for the condition
```

如果只是偶现，很快自动恢复，这个是正常的，不必担心。通常是因为节点上 kubelet 调 apiserver 接口获取 configmap 或 secret 的内容时超时了，超时原因可能是:
1. 被 apiserver 限速 (节点上pod多，或同时启动很多pod，对apiserver发起的调用多，导致被临时限速了一下)，一般很快可以自动恢复。
2. 被 kubelet 限速 (默认单节点向apiserver发送读请求每秒上限5个，所有类型请求每秒上限10个)。
  ```txt
  --kube-api-burst int32   Burst to use while talking with kubernetes apiserver. Doesn't cover events and node heartbeat apis which rate limiting is   controlled by a different set of flags (default 10)
  --kube-api-qps int32     QPS to use while talking with kubernetes apiserver. Doesn't cover events and node heartbeat apis which rate limiting is controlled by a different set of flags (default 5)
  ```

如果是一直报这个，排查下 RBAC 设置。