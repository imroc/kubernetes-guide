# 使用 kubectl get --raw

## 获取节点 cadvisor 指标

```bash
kubectl get --raw=/api/v1/nodes/11.185.19.215/proxy/metrics/cadvisor

# 查看有哪些指标名
kubectl get --raw=/api/v1/nodes/11.185.19.215/proxy/metrics/cadvisor | grep -v "#" | awk -F '{' '{print $1}' | awk '{print $1}' | sort | uniq
```

## 获取节点 kubelet 指标

```bash
kubectl get --raw=/api/v1/nodes/11.185.19.215/proxy/metrics
```

## 获取 node-exporter pod 指标

```bash
kubectl get --raw=/api/v1/namespaces/monitoring/pods/node-exporter-n5rz2:9100/proxy/metrics
```

## 获取节点 summary 数据

```bash
kubectl get --raw=/api/v1/nodes/11.185.19.21/proxy/stats/summary
```

## 查询 Resource Metrics

<Tabs>
  <TabItem value="all" label="命名空间下所有 Pod">

  ```bash
  kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/test-ns/pods/"
  ```

  :::tip[注意]

  注意替换 `test-ns` （ns 名称）。
  :::

  ![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925162846.png)

  </TabItem>

  <TabItem value="single" label="单个 Pod">

  ```bash
  kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/test-ns/pods/test-sts-0"
  ```

  :::tip[注意]

  注意替换 `test-ns`（ns 名称）和 `test-sts-0` (Pod 名称)。

  :::

  ![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925162948.png)

  </TabItem>
</Tabs>

## 查询 Custom Metrics

1. 查看有哪些可用的 custom metrics 指标：

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/"
```

2. 查询某个指标的值：

<Tabs>
  <TabItem value="all" label="命名空间下所有 Pod">

  ```bash
  kubectl get --raw  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/test-ns/pods/*/k8s_pod_gpu_used"
  ```

  :::tip[注意]

  注意替换 `test-ns`（ns 名称） 和 `k8s_pod_gpu_used` （指标名称）。

  :::

  </TabItem>

  示例输出：

  ```json
  {
    "kind": "MetricValueList",
    "apiVersion": "custom.metrics.k8s.io/v1beta1",
    "metadata": {
      "selfLink": "/apis/custom.metrics.k8s.io/v1beta1/namespaces/llama/pods/%2A/k8s_pod_gpu_memory_used_bytes"
    },
    "items": [
      {
        "describedObject": {
          "namespace": "llama",
          "name": "ollama-0"
        },
        "metricName": "k8s_pod_gpu_memory_used_bytes",
        "timestamp": "2024-05-06T07:23:54Z",
        "value": "110100480",
        "selector": null
      }
    ]
  }
  ```

  <TabItem value="single" label="单个 Pod">

  ```bash
  kubectl get --raw  "/apis/custom.metrics.k8s.io/v1beta1/namespaces/test-ns/pods/test-sts-0/k8s_pod_gpu_used"
  ```

  :::tip[注意]

  注意替换 `test-ns`（ns 名称）、`test-sts-0`（Pod 名称）、`k8s_pod_gpu_used`（指标名称）。

  :::

  </TabItem>

  示例输出：

  ```json
  {
    "kind": "MetricValueList",
    "apiVersion": "custom.metrics.k8s.io/v1beta1",
    "metadata": {
      "selfLink": "/apis/custom.metrics.k8s.io/v1beta1/namespaces/llama/pods/ollama-0/k8s_pod_gpu_memory_used_bytes"
    },
    "items": [
      {
        "describedObject": {},
        "metricName": "k8s_pod_gpu_memory_used_bytes",
        "timestamp": "2024-05-06T07:27:54Z",
        "value": "110100480",
        "selector": null
      }
    ]
  }
  ```
</Tabs>

