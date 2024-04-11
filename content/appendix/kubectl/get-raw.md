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

## 测试 Resource Metrics API

获取指定 namespace 下所有 pod 指标:

```bash
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/ns-prjzbsxs-1391012-production/pods/"
```

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925162846.png)

获取指定 pod 的指标:

```bash
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/namespaces/ns-prjzbsxs-1391012-production/pods/mixer-engine-0"
```

![](https://image-host-1251893006.cos.ap-chengdu.myqcloud.com/2023%2F09%2F25%2F20230925162948.png)
