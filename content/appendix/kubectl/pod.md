# Pod 相关

## 清理 Evicted 的 pod

<Tabs>
  <TabItem value="evicted" label="清理 Evicted 状态的 Pod">

    ``` bash
    kubectl get pod -o wide --all-namespaces | awk '{if($4=="Evicted"){cmd="kubectl -n "$1" delete pod "$2; system(cmd)}}'
    ```

  </TabItem>

  <TabItem value="not-running" label="清理所有非 Running 状态的 Pod">

    ``` bash
    kubectl get pod -o wide --all-namespaces | awk '{if($4!="Running"){cmd="kubectl -n "$1" delete pod "$2; system(cmd)}}'
    ```

  </TabItem>
</Tabs>

## 升级镜像

``` bash
export NAMESPACE="kube-system"
export WORKLOAD_TYPE="daemonset"
export WORKLOAD_NAME="ip-masq-agent"
export CONTAINER_NAME="ip-masq-agent"
export IMAGE="ccr.ccs.tencentyun.com/library/ip-masq-agent:v2.5.0"
```

``` bash
kubectl -n $NAMESPACE patch $WORKLOAD_TYPE $WORKLOAD_NAME --patch '{"spec": {"template": {"spec": {"containers": [{"name": "$CONTAINER_NAME","image": "$IMAGE" }]}}}}'
```

## 查看某命名空间的镜像列表

```bash
kubectl -n kube-system get pod -ojsonpath='{range .items[*]}{range .spec.containers[*]}{"\n"}{.image}{end}{end}' | sort | uniq
```
