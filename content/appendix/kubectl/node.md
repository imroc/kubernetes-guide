# Node 相关

## 表格输出节点 IP 相关属性

<Tabs>
  <TabItem value="cmd-podcidr" label="命令">

  ``` bash
  kubectl get no -o=custom-columns=NAME:.metadata.name,INTERNAL-IP:.status.addresses[0].address,EXTERNAL-IP:.status.addresses[1].address,CIDR:.spec.podCIDR
  ```

  </TabItem>

  <TabItem value="output-podcidr" label="输出效果">

  ```txt
  NAME                             INTERNAL-IP      EXTERNAL-IP      CIDR
  10.10.12.77                      162.14.64.201    10.10.12.77      172.16.20.0/24
  10.10.13.33                      10.10.13.33      118.25.219.109   172.16.25.0/24
  10.10.7.29                       10.10.7.29       10.10.7.29       172.16.23.0/24
  eklet-subnet-8a77e4wf-5wpifi8w   169.254.128.10                    <none>
  eklet-subnet-ahugkjhr-4fvrtpc4   169.254.128.10                    <none>
  ```

  </TabItem>
</Tabs>

## 表格输出各节点总可用资源 (Allocatable)

<Tabs>
  <TabItem value="cmd-allocatable" label="命令">

  ``` bash
  kubectl get no -o=custom-columns="NODE:.metadata.name,ALLOCATABLE CPU:.status.allocatable.cpu,ALLOCATABLE MEMORY:.status.allocatable.memory"
  ```

  </TabItem>

  <TabItem value="output-allocatable" label="输出效果">

  ```txt
  NODE       ALLOCATABLE CPU   ALLOCATABLE MEMORY
  10.0.0.2   3920m             7051692Ki
  10.0.0.3   3920m             7051816Ki
  ```

  </TabItem>
</Tabs>


## 输出各节点已分配资源的情况

### 所有种类的资源已分配情况概览

<Tabs>
  <TabItem value="cmd-allocated" label="命令">

  ``` bash
  kubectl get nodes --no-headers | awk '{print $1}' | xargs -I {} sh -c "echo {} ; kubectl describe node {} | grep Allocated -A 5 | grep -ve Event -ve Allocated -ve percent -ve --;"
  ```

  </TabItem>

  <TabItem value="output-allocated" label="输出效果">

  ```txt
  10.0.0.2
    Resource           Requests          Limits
    cpu                3040m (77%)       19800m (505%)
    memory             4843402752 (67%)  15054901888 (208%)
  10.0.0.3
    Resource           Requests   Limits
    cpu                300m (7%)  1 (25%)
    memory             250M (3%)  2G (27%)
  ```

  </TabItem>
</Tabs>


### 表格输出 cpu 已分配情况

<Tabs>
  <TabItem value="cmd-allocated-cpu" label="命令">

  ``` bash
  kubectl get nodes --no-headers | grep -v eklet- | awk '{print $1}' | xargs -I {} sh -c 'node="{}"; cpu=$(kubectl describe node "$node" | grep "Allocated resources:" -A5 | grep -ve Event -ve Allocated -ve percent -ve -- | grep cpu | awk '\''{print $2$3}'\''); printf "%s\t%s\n" "$node" "$cpu"'
  ```

  </TabItem>

  <TabItem value="output-allocated-cpu" label="输出效果">

  ```txt
  10.10.12.77     1392m(72%)
  10.10.13.33     163m(8%)
  10.10.7.29      1268m(65%)
  ```

  </TabItem>
</Tabs>

### 表格输出 memory 已分配情况

<Tabs>
  <TabItem value="cmd-allocated-mem" label="命令">

  ``` bash
  kubectl get nodes --no-headers | grep -v eklet- | awk '{print $1}' | xargs -I {} sh -c 'node="{}"; memory=$(kubectl describe node "$node" | grep "Allocated resources:" -A6 | grep -ve Event -ve Allocated -ve percent -ve -- | grep memory | awk '\''{print $2$3}'\''); printf "%s\t%s\n" "$node" "$memory"'
  ```

  </TabItem>

  <TabItem value="output-allocated-mem" label="输出效果">

  ```txt
  10.10.12.77     1296Mi(51%)
  10.10.13.33     129Mi(2%)
  10.10.7.29      1532964Ki(58%)
  ```

  </TabItem>
</Tabs>


## 查看节点可用区分布情况

<Tabs>
  <TabItem value="cmd-zone" label="命令">

  ``` bash
  kubectl get nodes -o=jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels.failure-domain\.beta\.kubernetes\.io\/zone}{"\n"}{end}'
  ```

  </TabItem>

  <TabItem value="output-zone" label="输出效果">

  ```txt
  10.83.96.127    100004
  10.83.96.132    100004
  10.83.96.139    100004
  10.83.96.8      100004
  10.83.96.93     100004
  ```

  </TabItem>
</Tabs>
