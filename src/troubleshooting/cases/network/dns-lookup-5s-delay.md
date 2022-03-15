# DNS 5 秒延时

## 现象

用户反馈从 pod 中访问服务时，总是有些请求的响应时延会达到5秒。正常的响应只需要毫秒级别的时延。

## 抓包

* [使用 nsenter 进入 netns](../../../trick/network/enter-netns-with-nsenter.md)，然后使用节点上的 tcpdump 抓 pod 中的包，发现是有的 DNS 请求没有收到响应，超时 5 秒后，再次发送 DNS 请求才成功收到响应。
* 在 kube-dns pod 抓包，发现是有 DNS 请求没有到达 kube-dns pod，在中途被丢弃了。

为什么是 5 秒？ `man resolv.conf` 可以看到 glibc 的 resolver 的缺省超时时间是 5s:

```txt
timeout:n
       Sets the amount of time the resolver will wait for a response from a remote name server before retrying the query via a different name server.  Measured in seconds, the default is RES_TIMEOUT (currently  5,  see
       <resolv.h>).  The value for this option is silently capped to 30.
```

## 丢包原因

经过搜索发现这是一个普遍问题。

根本原因是内核 conntrack 模块的 bug，netfilter 做 NAT 时可能发生资源竞争导致部分报文丢弃。

Weave works的工程师 [Martynas Pumputis](martynas@weave.works) 对这个问题做了很详细的分析：[Racy conntrack and DNS lookup timeouts](https://www.weave.works/blog/racy-conntrack-and-dns-lookup-timeouts)

相关结论：

* 只有多个线程或进程，并发从同一个 socket 发送相同五元组的 UDP 报文时，才有一定概率会发生
* glibc, musl\(alpine linux的libc库\)都使用 "parallel query", 就是并发发出多个查询请求，因此很容易碰到这样的冲突，造成查询请求被丢弃
* 由于 ipvs 也使用了 conntrack, 使用 kube-proxy 的 ipvs 模式，并不能避免这个问题

## 问题的根本解决

Martynas 向内核提交了两个 patch 来 fix 这个问题，不过他说如果集群中有多个DNS server的情况下，问题并没有完全解决。

其中一个 patch 已经在 2018-7-18 被合并到 linux 内核主线中: [netfilter: nf\_conntrack: resolve clash for matching conntracks](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=ed07d9a021df6da53456663a76999189badc432a)

目前只有4.19.rc 版本包含这个patch。

## 规避办法

### 规避方案一：使用TCP发送DNS请求

由于TCP没有这个问题，有人提出可以在容器的resolv.conf中增加`options use-vc`, 强制glibc使用TCP协议发送DNS query。下面是这个man resolv.conf中关于这个选项的说明：

```text
use-vc (since glibc 2.14)
                     Sets RES_USEVC in _res.options.  This option forces the
                     use of TCP for DNS resolutions.
```

笔者使用镜像"busybox:1.29.3-glibc" \(libc 2.24\) 做了试验，并没有见到这样的效果，容器仍然是通过UDP发送DNS请求。

### 规避方案二：避免相同五元组DNS请求的并发

resolv.conf还有另外两个相关的参数：

* single-request-reopen \(since glibc 2.9\)
* single-request \(since glibc 2.10\)

man resolv.conf中解释如下：

```text
single-request-reopen (since glibc 2.9)
                     Sets RES_SNGLKUPREOP in _res.options.  The resolver
                     uses the same socket for the A and AAAA requests.  Some
                     hardware mistakenly sends back only one reply.  When
                     that happens the client system will sit and wait for
                     the second reply.  Turning this option on changes this
                     behavior so that if two requests from the same port are
                     not handled correctly it will close the socket and open
                     a new one before sending the second request.

single-request (since glibc 2.10)
                     Sets RES_SNGLKUP in _res.options.  By default, glibc
                     performs IPv4 and IPv6 lookups in parallel since
                     version 2.9.  Some appliance DNS servers cannot handle
                     these queries properly and make the requests time out.
                     This option disables the behavior and makes glibc
                     perform the IPv6 and IPv4 requests sequentially (at the
                     cost of some slowdown of the resolving process).
```

用自己的话解释下：

* `single-request-reopen`: 发送 A 类型请求和 AAAA 类型请求使用不同的源端口，这样两个请求在 conntrack 表中不占用同一个表项，从而避免冲突
* `single-request`: 避免并发，改为串行发送 A 类型和 AAAA 类型请求，没有了并发，从而也避免了冲突

要给容器的 `resolv.conf` 加上 options 参数，有几个办法：

1. 在容器的 "ENTRYPOINT" 或者 "CMD" 脚本中，执行 /bin/echo 'options single-request-reopen' &gt;&gt; /etc/resolv.conf**

2. 在 pod 的 postStart hook 中:

```yaml
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/sh
              - -c 
              - "/bin/echo 'options single-request-reopen' >> /etc/resolv.conf"
```

3. 使用 template.spec.dnsConfig (k8s v1.9 及以上才支持):

```yaml
  template:
    spec:
      dnsConfig:
        options:
          - name: single-request-reopen
```

4. 使用 ConfigMap 覆盖 pod 里面的 /etc/resolv.conf:

configmap:

```yaml
apiVersion: v1
data:
  resolv.conf: |
    nameserver 1.2.3.4
    search default.svc.cluster.local svc.cluster.local cluster.local ec2.internal
    options ndots:5 single-request-reopen timeout:1
kind: ConfigMap
metadata:
  name: resolvconf
```

pod spec:

```yaml
        volumeMounts:
        - name: resolv-conf
          mountPath: /etc/resolv.conf
          subPath: resolv.conf
...

      volumes:
      - name: resolv-conf
        configMap:
          name: resolvconf
          items:
          - key: resolv.conf
            path: resolv.conf
```

5. 使用 MutatingAdmissionWebhook

[MutatingAdmissionWebhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#mutatingadmissionwebhook-beta-in-1-9) 是 1.9 引入的 Controller，用于对一个指定的 Resource 的操作之前，对这个 resource 进行变更。 istio 的自动 sidecar注入就是用这个功能来实现的。 我们也可以通过 MutatingAdmissionWebhook，来自动给所有POD，注入以上3\)或者4\)所需要的相关内容。

以上方法中， 1 和 2 都需要修改镜像， 3 和 4 则只需要修改 pod 的 spec， 能适用于所有镜像。不过还是有不方便的地方：

* 每个工作负载的yaml都要做修改，比较麻烦
* 对于通过helm创建的工作负载，需要修改helm charts

方法5\)对集群使用者最省事，照常提交工作负载即可。不过初期需要一定的开发工作量。

### 最佳实践：使用 LocalDNS

容器的DNS请求都发往本地的DNS缓存服务 (dnsmasq, nscd 等)，不需要走DNAT，也不会发生conntrack冲突。另外还有个好处，就是避免DNS服务成为性能瓶颈。

使用 LocalDNS 缓存有两种方式：

* 每个容器自带一个DNS缓存服务
* 每个节点运行一个DNS缓存服务，所有容器都把本节点的DNS缓存作为自己的 nameserver

从资源效率的角度来考虑的话，推荐后一种方式。官方也意识到了这个问题比较常见，给出了 coredns 以 cache 模式作为 daemonset 部署的解决方案: [https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)

### 实施办法

条条大路通罗马，不管怎么做，最终到达上面描述的效果即可。

POD中要访问节点上的DNS缓存服务，可以使用节点的IP。 如果节点上的容器都连在一个虚拟bridge上， 也可以使用这个bridge的三层接口的IP(在TKE中，这个三层接口叫cbr0)。 要确保DNS缓存服务监听这个地址。

如何把 POD 的 /etc/resolv.conf 中的 nameserver 设置为节点IP呢？

一个办法，是设置 POD.spec.dnsPolicy 为 "Default"， 意思是POD里面的 /etc/resolv.conf， 使用节点上的文件。缺省使用节点上的 /etc/resolv.conf (如果kubelet通过参数--resolv-conf指定了其他文件，则使用--resolv-conf所指定的文件)。

另一个办法，是给每个节点的kubelet指定不同的--cluster-dns参数，设置为节点的IP，POD.spec.dnsPolicy仍然使用缺省值"ClusterFirst"。 kops项目甚至有个issue在讨论如何在部署集群时设置好--cluster-dns指向节点IP: [https://github.com/kubernetes/kops/issues/5584](https://github.com/kubernetes/kops/issues/5584)

## 参考资料

* [Racy conntrack and DNS lookup timeouts](https://www.weave.works/blog/racy-conntrack-and-dns-lookup-timeouts)
* [5 – 15s DNS lookups on Kubernetes?](https://blog.quentin-machu.fr/2018/06/24/5-15s-dns-lookups-on-kubernetes/)
* [DNS intermittent delays of 5s](https://github.com/kubernetes/kubernetes/issues/56903)
* [记一次Docker/Kubernetes上无法解释的连接超时原因探寻之旅](https://mp.weixin.qq.com/s/VYBs8iqf0HsNg9WAxktzYQ)

