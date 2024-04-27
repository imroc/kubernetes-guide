# 多级服务同步水平伸缩 (Workload 触发器)

## Workload 触发器

KEDA 支持 Kubernetes Workload 触发器，即可以根据的一个或多个工作负载的 Pod 数量来扩缩容，在多级服务调用的场景下很有用，具体用法参考 [KEDA Scalers: Kubernetes Workload](https://keda.sh/docs/2.13/scalers/kubernetes-workload/)。

## 案例：多级服务同时扩容

比如下面这种多级微服务调用：

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2024%2F04%2F08%2F20240408084514.png)

* A、B、C 这一组服务通常有比较固定的数量比例。
* A 的压力突增，迫使扩容，B 和 C 也可以用 KEDA 的 Kubernetes Workload 触发器实现与 A 几乎同时扩容，而无需等待压力逐级传导才缓慢迫使扩容。

首先配置 A 的扩容，根据 CPU 和内存压力扩容：

```yaml showLineNumbers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: a
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: a
  pollingInterval: 15
  minReplicaCount: 10
  maxReplicaCount: 1000
  triggers:
    - type: memory
      metricType: Utilization
      metadata:
        value: "60"
    - type: cpu
      metricType: Utilization
      metadata:
        value: "60"
```

然后配置 B 和 C 的扩容，假设固定比例 A:B:C = 3:3:2。

<Tabs>
  <TabItem value="B" label="B">

   ```yaml showLineNumbers
   apiVersion: keda.sh/v1alpha1
   kind: ScaledObject
   metadata:
     name: b
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: b
     pollingInterval: 15
     minReplicaCount: 10
     maxReplicaCount: 1000
     triggers:
       # highlight-start
       - type: kubernetes-workload
         metadata:
           podSelector: 'app=a' # 选中 A 服务
           value: '1' # A/B=3/3=1
       # highlight-end
   ```

  </TabItem>

  <TabItem value="C" label="C">

   ```yaml showLineNumbers
   apiVersion: keda.sh/v1alpha1
   kind: ScaledObject
   metadata:
     name: c
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: c
     pollingInterval: 15
     minReplicaCount: 3
     maxReplicaCount: 340
     triggers:
       # highlight-start
       - type: kubernetes-workload
         metadata:
           podSelector: 'app=a' # 选中 A 服务
           value: '1.5' # A/C=3/2=1.5
       # highlight-end
   ```

  </TabItem>
</Tabs>

