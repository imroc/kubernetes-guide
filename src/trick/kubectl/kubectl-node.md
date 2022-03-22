# Node 相关

## 表格输出各节点占用的 podCIDR

``` bash
$ kubectl get no -o=custom-columns=INTERNAL-IP:.metadata.name,EXTERNAL-IP:.status.addresses[1].address,CIDR:.spec.podCIDR
INTERNAL-IP     EXTERNAL-IP       CIDR
10.100.12.194   152.136.146.157   10.101.64.64/27
10.100.16.11    10.100.16.11      10.101.66.224/27
```

## 表格输出各节点总可用资源 (Allocatable)

``` bash
$ kubectl get no -o=custom-columns="NODE:.metadata.name,ALLOCATABLE CPU:.status.allocatable.cpu,ALLOCATABLE MEMORY:.status.allocatable.memory"
NODE       ALLOCATABLE CPU   ALLOCATABLE MEMORY
10.0.0.2   3920m             7051692Ki
10.0.0.3   3920m             7051816Ki
```

## 输出各节点已分配资源的情况

所有种类的资源已分配情况概览：

``` bash
$ kubectl get nodes --no-headers | awk '{print $1}' | xargs -I {} sh -c "echo {} ; kubectl describe node {} | grep Allocated -A 5 | grep -ve Event -ve Allocated -ve percent -ve --;"
10.0.0.2
  Resource           Requests          Limits
  cpu                3040m (77%)       19800m (505%)
  memory             4843402752 (67%)  15054901888 (208%)
10.0.0.3
  Resource           Requests   Limits
  cpu                300m (7%)  1 (25%)
  memory             250M (3%)  2G (27%)
```

表格输出 cpu 已分配情况:

``` bash
$ kubectl get nodes --no-headers | awk '{print $1}' | xargs -I {} sh -c 'echo -ne "{}\t" ; kubectl describe node {} | grep Allocated -A 5 | grep -ve Event -ve Allocated -ve percent -ve -- | grep cpu | awk '\''{print $2$3}'\'';'
10.0.0.10	460m(48%)
10.0.0.12	235m(25%)
```

表格输出 memory 已分配情况:

``` bash
$ kubectl get nodes --no-headers | awk '{print $1}' | xargs -I {} sh -c 'echo -ne "{}\t" ; kubectl describe node {} | grep Allocated -A 5 | grep -ve Event -ve Allocated -ve percent -ve -- | grep memory | awk '\''{print $2$3}'\'';'
10.0.0.10	257460608(41%)
10.0.0.12	59242880(9%)
```

## 查看节点可用区分布情况

```bash
$ kubectl get nodes -o=jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels.failure-domain\.beta\.kubernetes\.io\/zone}{"\n"}{end}'
10.83.96.127    100004
10.83.96.132    100004
10.83.96.139    100004
10.83.96.8      100004
10.83.96.93     100004
```