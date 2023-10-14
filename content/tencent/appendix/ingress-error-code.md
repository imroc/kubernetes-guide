# Ingress 错误码

## E4000 CreateLoadBalancer RequestLimitExceeded

接口调用出现短时间内出现超频情况，错误会重试。少量出现对服务没有影响。

## E4003 CreateLoadBalancer LimitExceeded

故障原因: 负载均衡资源数量受限。

处理办法: 提交工单申请提高负载均衡的资源数量上限。

## E4004 CreateListener LimitExceeded

故障原因: 负载均衡资源下的监听器数量受限。

处理办法: 提交工单申请提高负载均衡下监听器的资源数量上限。

## E4005 CreateRule LimitExceeded

故障原因: 负载均衡资源下的规则数量受限。

处理办法: 提交工单申请提高负载均衡下的规则的资源数量上限。

## E4006 DeleteListener Redirection config on the listener

故障原因: 在 Ingress 管理的监听器下面设置了重定向规则，导致监听器删除失败。

处理办法: 需要自行处理该重定向规则，Ingress 会在接下来的重试中删除该监听器。

## E4007 Norm AssumeTkeCredential -8017 | -8032 Record Not Exist

故障原因: 绝大部分的情况是修改了 `ip-masq-agent-config`，导致访问 Norm 的请求没有进行 IP 伪装，导致 Norm 的鉴权未通过。

**排查步骤**

1. 检查当前配置:

```bash
kubectl get configmap -n kube-system ip-masq-agent-config
```

```txt
nonMasqueradeCIDRs:  // 所有pod出去的流量没有进行IP伪装, Norm针对来源IP鉴权（Node）
    - 0.0.0.0/0

nonMasqueradeCIDRs:  // 正常情况, 这里配置的是集群网络和VPC网络的CIDR
    - 10.0.0.0/14
    - 172.16.0.0/16
```

2. 检查`ip-masq-agent` 的重启时间，是不是最近有过更新:

```bash
$ kubectl get pod -n kube-system -l name=ip-masq-agent
NAME                  READY     STATUS    RESTARTS   AGE
ip-masq-agent-n4p9k   1/1       Running   0          4h
ip-masq-agent-qj6rk   1/1       Running   0          4h
```

处理办法:
* 修改 `ip-masq-agent-config` 中 `的nonMasqueradeCIDRs`，使用一个合理的配置。
* 确认 Masq 配置正确后，重启 Ingress Controller 组件。

## E4008 Norm AssumeTkeCredential -8002 Data is nil

故障原因: 撤销了对于腾讯云容器服务的授权，导致服务无法运行

处理办法:
* 登录访问管理服务，找到角色 `TKE_QCSRole`（没有则创建）
* 创建服务预设角色并授予腾讯云容器服务相关权限

## E4009 Ingress: xxx secret name is empty

故障原因: Ingress模板格式错误。spec.tls.secretName 没有填写或为空

处理办法:
* 帮助文档地址: https://kubernetes.io/docs/concepts/services-networking/ingress/#tls
* 检查并修改Ingress模板

## E4010 Secret xxx not found

故障原因: Ingress模板信息错误。spec.tls.secretName 中填写的Secrets资源不存在

处理办法:
* 帮助文档地址: https://kubernetes.io/docs/concepts/configuration/secret/
* 查并修改Ingress模板

## E4011 Secret xxx has no qcloud cert id

故障原因: Ingress模板中引用的Secrets内容缺失。或引用的Secrets需要包含qcloud_cert_id字段信息

处理办法:

* 参考 K8S 官方文档: https://kubernetes.io/docs/concepts/configuration/secret/
* 检查证书配置:
  ```bash
  $ kubectl get ingress <ingress> -n <namespace> -o yaml
  apiVersion: extensions/v1beta1
  kind: Ingress
  metadata:
    annotations:
      qcloud_cert_id: YCOLTUdr <-- 检查这个是不是证书ID
  spec:
    tls:
    - secretName: secret-name <-- 检查配置Secret名称
  ```
* 检查Secret配置:
  ```bash
  $ kubectl get secret <secret-name> -n <namespace> -o yaml
  apiVersion: v1
  data:
    qcloud_cert_id: WUNPTFRVZHI= <-- 检查这个是不是证书ID的Base64编码
  kind: Secret
  metadata:
    name: nginx-service-2 
    namespace: default
  type: Opaque
  
  $ echo -n "WUNPTFRVZHI=" | base64 -d
  YCOLTUdr    <-- 证书ID一致
  ```

* 如何创建Secret:
  ```bash
  kubectl create secret generic <secret-name> -n <namespace> --from-literal=qcloud_cert_id=YCOLTUdr   <-- 证书ID
  ```

## E4012 CreateListener InvalidParameterValue

故障原因: 大概率是Ingress模板信息错误。spec.tls.secretName中指定的Secrets资源中描述的qcloud_cert_id不存在。

排查步骤: 查到错误原因，如果错误原因是Query certificate 'xxxxxxx' failed.，确定是的证书ID填写错误。

处理办法:
* 登录 SSL证书 控制台，检查证书的ID是否正确。
* 随后修改Secrets中的证书ID

## E4013 Ingress rules invalid. 'spec.rules.http' is empty.

故障原因: Ingress模板不正确，spec.rules.http没有填写实际内容

处理办法: 修正自己的Ingress模板

## E4017 负载均衡的标签存在篡改

故障原因：修改了负载均衡的标签，导致根据标签定位负载均衡资源失败。

处理办法：
* 由于标签或负载均衡资源被删除或篡改，数据可能存在不一致，建议删除负载均衡、或删除负载均衡所有标签，然后重建Ingress资源。

## E4018 kubernetes.io/ingress.existLbId 中指定的LB资源不存在

故障原因: Ingress模板不正确，Annotation `kubernetes.io/ingress.existLbId` 中指定的LoadBalance不存在

排查步骤: 检查日志中给出的LBId, 检查改账号在该地域是否存在此LB资源。

处理办法:
* 如果查询后台系统，确认LB资源的确存在。转交工单到CLB，排查为何资源查询失败。
* 如果查询后台系统，确认LB资源不存在。检查模板中定义的LBId是否正确

## E4019 Can not use lb: created by TKE for ingress: xxx

故障原因: kubernetes.io/ingress.existLbId中指定的LBId已经被Ingress或是Service使用（资源生命周期由TKE集群管理），不能重复使用

相关参考: Ingress 的声明周期管理

处理办法:
* 更换其他LB
* 删除使用了这个LB资源的Ingress或Service（按以下步骤操作）
  * 删除LB资源上的tke-createdBy-flag资源
  * 删除使用了这个LB资源的Ingress或Service。（如果不做第一步，LB资源会被自动销毁）
  * 指定新的Ingress使用这个LB.
  * 在该LB资源上打上tke-createdBy-flag=yes的标签. (如果不做这一步，该资源的生命周期将不会被Ingress负责，后续该资源不会自动销毁)

## E4020 Error lb: used by ingress: xxx

故障原因: `kubernetes.io/ingress.existLbId` 中指定的LBId已经被Ingress使用，不能重复使用

相关参考: Ingress 的声明周期管理

处理办法:
* 更换其他LB
* 删除使用了这个LB资源的Ingress
  * 删除LB资源上的tke-createdBy-flag资源（按以下步骤操作）
  * 删除使用了这个LB资源的Ingress或Service。（如果不做第一步，LB资源会被自动销毁）
  * 指定新的Ingress使用这个LB.
  * 在该LB资源上打上tke-createdBy-flag=yes的标签. (如果不做这一步，后续该资源的生命周期将不会被Ingress负责，该资源不会自动销毁)

## E4021 exist lb: xxx listener not empty

故障原因: `kubernetes.io/ingress.existLbId` 中指定的LBId中还有监听器没有删除。

详细描述: 使用已有LB时，如果LB上存在监听器，可能造成LB资源的误操作。所以禁用还存在监听器的存量监听器。

处理办法:
* 更换其他LB
* 删除该LB下的所有监听器

## E4022 Ingress rules invalid.

故障原因: kubernetes.io/ingress.http-rules 标签的格式解析错误

详细描述: kubernetes.io/ingress.http-rules 标签内容应该是一个Json格式的字符串，内容不正确时会报错

处理办法: 检查模板中定义的 http-rules 是否正确

格式示例: 

```yaml
kubernetes.io/ingress.http-rules: '[{"path":"/abc","backend":{"serviceName":"nginx-service-2","servicePort":"8080"}}]'
```

## E4023 create lb error: ResourceInsufficient

故障原因: kubernetes.io/ingress.https-rules 标签的格式解析错误

详细描述: kubernetes.io/ingress.https-rules 标签内容应该是一个Json格式的字符串，内容不正确时会报错

处理办法: 检查模板中定义的 https-rules 是否正确

格式示例:

```yaml
kubernetes.io/ingress.https-rules: '[{"path":"/abc","backend":{"serviceName":"nginx-service-2","servicePort":"8080"}}]'
```

## E4024 create lb error: InvalidParameter or InvalidParameterValue

故障原因: 创建Ingress LB时，通过注解配置的参数有错误。

详细描述: 注解配置的删除，不合法

处理办法: 检查注解参数

## E4025 create lb error: ResourceInsufficient

故障原因: 创建Ingress LB时，资源不足。

详细描述: 通常是内网型LB的子网IP数量不足

处理办法: 检查子网IP是否耗尽

## E4026 Ingress extensive parameters invalid.

故障原因: 创建Ingress LB时，kubernetes.io/ingress.extensiveParameters 标签的格式解析错误

详细描述: 提供的注解内容不是一个合法的JSON字符串

处理办法:
* 修改注解内容，给出一个示例参考：`kubernetes.io/ingress.extensiveParameters: '{"AddressIPVersion":"IPv4","ZoneId":"ap-guangzhou-1"}'`
* 参数参考文档：https://cloud.tencent.com/document/product/214/30692 

## E4027 EnsureCreateLoadBalancer Insufficient Account Balance

故障原因: 账户欠费

处理办法: 充钱就好

## E4030 This interface only support HTTP/HTTPS listener

故障原因: 通过使用已有LB的方式，使用传统型CLB无法创建七层规则

处理办法: 需要修改指定的CLB，或删除标签让Ingress主动创建CLB

## E4031 Ingress rule invalid. Invalid path.

故障原因: 模板中填写的七层规则，Path的格式不符合规则

处理办法: 检查路径是否符合以下格式。

* 默认为 `/`，必须以 `/` 开头，长度限制为 1-120。
* 非正则的 URL 路径，以 `/` 开头，支持的字符集如下：`a-z A-Z 0-9 . - / = ?`。

## E4032 LoadBalancer AddressIPVersion Error

故障原因: 使用了错误的 `AddressIPVersion` 参数

详细描述: 目前基于IPv4网络的集群只支持，IPv4和NAT IPv6类型的负载均衡。不支持纯IPv6类型的负载均衡。

处理办法:
* 如果是创建负载均衡的情况。修改一下kubernetes.io/ingress.extensiveParameters参数。
* 如果是使用已有负载均衡的情况。不能选用该负载均衡，需要更换其他负载均衡。

## E4033 LoadBalancer AddressIPVersion do not support

故障原因: 该地域不支持IPv6类型的负载均衡。

详细描述: 目前不是所有地域都支持IPv6的负载均衡，有强业务需求的请联系负载均衡提出需求。

## E4034 Ingress RuleHostEmpty

故障原因: Ingress规则中没有配置Host

详细描述: 目前针对IPv4的负载均衡，不配置Host的情况下会使用IPv4的地址作为Host。当使用纯IPv6负载均衡时，默认Host的逻辑不存在，必须指定域名。

处理办法: 修改 Ingress，补充Ingress的Host字段

## E4035 LoadBalancer CertificateId Invalid

故障原因: 证书ID格式不正确。（CertId长度不正确）

处理办法:
* 参考文档：https://cloud.tencent.com/document/product/457/45738 
* 登录负载均衡控制台，确认证书ID，修改Ingress使用的Secret资源内描述的证书ID。

## E4036 LoadBalancer CertificateId NotFound

故障原因: 证书ID不存在。
处理办法:
* 参考文档：https://cloud.tencent.com/document/product/457/45738 
* 登录负载均衡控制台，确认证书ID，修改Ingress使用的Secret资源内描述的证书ID。

## E4037 Annotation 'ingress.cloud.tencent.com/direct-access' Invalid

故障原因: ingress.cloud.tencent.com/direct-access的合法值是 true 或 false

处理办法: 检查配置的 `ingress.cloud.tencent.com/direct-access` 注解内容是否是一个合法的 bool 值。

## E4038 Certificate Type Error

故障原因: 配置的证书类型，需要是服务端证书。不能使用客户端证书配置单向证书。

处理办法: 
* 登录负载均衡控制台，检查使用的证书类型，确认使用的是服务端证书。
* 如果确认是客户端证书，需要修改。
* 如果确认是服务端证书，联系负载均衡排查证书使用故障。

## E4038 Certificate Out of Date / E4039 Certificate Out of Date

故障原因: 配置的证书过期了，检查配置的证书的过期时间。

处理办法: 
* 参考文档：https://cloud.tencent.com/document/product/457/45738 
* 登录负载均衡控制台，检查使用的证书的过期时间。
* 更换新的证书，并更新Ingress使用的Secret资源，同步证书。

## E4040 Certificate Not Found for SNI

故障原因: Ingress中描述的域名，存在一个或多个没有包含在TLS的域名证书规则中。

处理办法: 
* 参考文档：https://cloud.tencent.com/document/product/457/45738 
* 检查是否有域名没有提供对应的证书Secret资源。

## E4041 Service Not Found

故障原因: Ingress中引用的Service不存在
处理办法: 检查Ingress中声明使用的所有Service资源是否存在，注意在Service和Ingress需要在同一个命名空间下。

## E4042 Service Port Not Found

故障原因: Ingress中引用的Service端口不存在

处理办法: 检查Ingress中声明使用的所有Service资源及其使用的端口是否存在。

## E4043 TkeServiceConfig Not Found

故障原因: Ingress通过"ingress.cloud.tencent.com/tke-service-config"注解引用的TkeServiceConfig资源不存在

处理办法: 
* 参考文档: https://cloud.tencent.com/document/product/457/45700
* 检查Ingress注解中声明的TkeServiceConfig资源是否存在，注意在同一命名空间中。查询命令：`kubectl get tkeserviceconfigs.cloud.tencent.com -n <namespace> <name>`

## E4044  Mixed Rule Invalid

故障原因: Ingress的注解"kubernetes.io/ingress.rule-mix"不是一个合法的JSON字符串。

处理办法: 
* https://cloud.tencent.com/document/product/457/45693
* 参考文档，编写正确的注解内容。或者通过控制台使用Ingress混合协议功能。

## E4045  InternetChargeType Invalid

故障原因: Ingress的注解"kubernetes.io/ingress.internetChargeType"内容不合法。

处理办法: 参考 InternetChargeType 参数的可选值：https://cloud.tencent.com/document/api/214/30694#InternetAccessible 

## E4046  InternetMaxBandwidthOut Invalid

故障原因: Ingress的注解"kubernetes.io/ingress.internetMaxBandwidthOut"内容不合法。

处理办法: 参考 InternetMaxBandwidthOut 参数的可选值：https://cloud.tencent.com/document/api/214/30694#InternetAccessible 

## E4047  Service Type Invalid

故障原因: 作为Ingress后端引用的Service，类型只能是NodePort或LoadBalancer。
处理办法: 检查Service类型，建议使用NodePort或LoadBalancer类型的Service作为Ingress后端。

## E4048 Default Secret conflict.

故障原因: Ingress中，TLS声明了多个默认证书，出现冲突

处理办法: 
* https://cloud.tencent.com/document/product/457/45738
* 检查TLS配置，最多配置一个默认证书。修改更新配置后会自动同步。

## E4049 SNI Secret conflict.

故障原因: Ingress中，TLS声明了多个证书对应同一个域名，出现冲突

处理办法: 
* https://cloud.tencent.com/document/product/457/45738
* 检查TLS配置，最多为单个域名配置一个证书。修改更新配置后会自动同步。

## E4050 Annotation 'ingress.cloud.tencent.com/tke-service-config-auto' Invalid

故障原因: ingress.cloud.tencent.com/tke-service-config-auto的合法值是 true 或 false
处理办法: 检查配置的 `ingress.cloud.tencent.com/tke-service-config-auto` 注解内容是否是一个合法的 bool 值。

## E4051 Annotation 'ingress.cloud.tencent.com/tke-service-config' Name Invalid

故障原因: ingress.cloud.tencent.com/tke-service-config的名称不能以 '-auto-ingress-config' or '-auto-service-config' 为后缀。会和自动同步的配置名称出现冲突。
处理办法: 修改注解 ’ingress.cloud.tencent.com/tke-service-config’ ，使用其他名称的TkeServiceConfig资源。

## E4052 Ingress Host Invalid

故障原因: 根据K8S的限制，Ingress的Host需要满足正则表达式 `(\*|[a-z0-9]([-a-z0-9]*[a-z0-9])?)(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)+`

处理办法: 默认情况下域名都是符合以上要求的。排除一下域名没有 “.”，域名包含特殊字符等情况就可以了。

## E4053 LoadBalancer Subnet IP Insufficient

故障原因: 负载均衡所在子网的IP已经用光，无法在配置的子网下创建负载均衡。

处理办法: 
* 确定选定子网所使用的注解：“kubernetes.io/ingress.subnetId”。
* 建议改用其他子网，或者在该子网下释放一些IP资源。

## E4091 CreateLoadBalancer Invoke vpc failed: subnet not exists

故障原因: 创建内网型LB时指定的子网不正确。

处理办法: 检查Ingress模板中的kubernetes.io/ingress.subnetId字段中描述的子网ID是否正确

## E5003 CLB InternalError

故障原因: CLB内部错误

处理办法: 转至CLB排查原因

## E5004 CVM InternalError

故障原因: CVM内部错误

处理办法: 将工单立刻转至CVM排查后续原因

## E5005 TAG InternalError

故障原因: 标签服务内部错误

处理办法: 将工单立刻转至标签服务排查后续原因

## E5007 Norm InternalError

故障原因: 服务内部错误

处理办法: 将工单立刻转至标签服务排查后续原因

## E5008 TKE InternalError

故障原因: 服务内部错误

处理办法: 将工单立刻转至标签服务排查后续原因

## E5009 CLB BatchTarget Faild

故障原因: CLB内部错误, 后端批量绑定、解绑出现部分错误

处理办法: 将工单立刻转至CLB排查后续原因

## E6001 Failed to get zone from env: TKE_REGION / E6002 Failed to get vpcId from env: TKE_VPC_ID

故障原因: 集群资源 configmap tke-config 配置缺失，导致容器启动失败
处理办法:
  * `kubectl get configmap -n kube-system tke-config` 检查configmap是否存在
  * `kubectl create configmap tke-config -n kube-system --from-literal=TKE_REGION=<ap-shanghai-fsi> --from-literal=TKE_VPC_ID=<vpc-6z0k7g8b>` 创建configmap，region、vpc_id需要根据集群具体信息进行修改
  * `kubectl edit deployment  -n kube-system  l7-lb-controller -o yaml` 确保模板内的 env 内容正确。
    ```yaml
    spec:
      containers:
      - args:
        - --cluster-name=<cls-a0lcxsdm>
        env:
        - name: TKE_REGION
          valueFrom:
            configMapKeyRef:
              key: TKE_REGION
              name: tke-config
        - name: TKE_VPC_ID
          valueFrom:
            configMapKeyRef:
              key: TKE_VPC_ID
              name: tke-config
    ```

## E6006 Error during sync: Post https://clb.internal.tencentcloudapi.com/: dial tcp: i/o timeout

故障原因 A: CoreDNS对相关API服务的域名解析出现错误

可能涉及到相同问题的域名:

```txt
lb.api.qcloud.com
tag.api.qcloud.com
cbs.api.qcloud.com
cvm.api.qcloud.com
snapshot.api.qcloud.com
monitor.api.qcloud.com
scaling.api.qcloud.com
ccs.api.qcloud.com
tke.internal.tencentcloudapi.com
clb.internal.tencentcloudapi.com
cvm.internal.tencentcloudapi.com
```

处理办法: 对l7-lb-controller追加以下域名解析。

```bash
kubectl patch deployment l7-lb-controller -n kube-system --patch '{"spec":{"template":{"spec":{"hostAliases":[{"hostnames":["lb.api.qcloud.com","tag.api.qcloud.com","cbs.api.qcloud.com","cvm.api.qcloud.com","snapshot.api.qcloud.com","monitor.api.qcloud.com","scaling.api.qcloud.com","ccs.api.qcloud.com"],"ip":"169.254.0.28"},{"hostnames":["tke.internal.tencentcloudapi.com","clb.internal.tencentcloudapi.com","cvm.internal.tencentcloudapi.com"],"ip":"169.254.0.95"}]}}}}'
```

故障原因 B: 集群网络问题

处理办法: 暂无，提工单，并附上日志中的异常栈信息。

## E6007 | E6009 Ingress InternalError

故障原因: Ingress 内部错误

处理办法: 将工单立刻转至misakazhou，并附上日志中的异常栈信息。

## W1000 Service xxx not found in store

告警原因: 指定的Service不存在，Ingress规则无法找到对应绑定的后端。
处理办法: 检查集群Service资源中是否存在 backend.serviceName 所描述的资源

## W1001 clean not creatted by TKE loadbalancer: xxx for ingress:

告警原因: 删除Ingress的时候，Ingress使用的负载均衡没有被删除

详细描述: Ingress使用的负载均衡资源没有tke-createdBy-flag=yes的标签，生命周期没有在Ingress的管理之下。需要自行手动删除。

处理办法: 需要的话，可以选择手动删除该负载均衡资源

## W1002 do not clean listener.

告警原因: 删除Ingress的时候，Ingress使用的负载均衡下的监听器没有被删除

详细描述: Ingress使用的负载均衡资源下的监听器名称不是TKE-DEDICATED-LISTENER，该监听器不是Ingress创建的或是被修改，生命周期没有在Ingress的管理之下。需要自行手动删除。

处理办法: 需要的话，可以选择手动删除该负载均衡资源下的监听器
