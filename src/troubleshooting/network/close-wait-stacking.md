# 排查 CLOSE_WAIT 堆积

TCP 连接的 `CLOSE_WAIT` 状态，正常情况下是短暂的，如果出现堆积，一般说明应用有问题。

## CLOSE_WAIT 堆积的危害

每个 `CLOSE_WAIT` 连接会占据一个文件描述，堆积大量的 `CLOSE_WAIT` 可能造成文件描述符不够用，导致建连或打开文件失败，报错 `too many open files`:

```txt
dial udp 9.215.0.48:9073: socket: too many open files
```

## 如何判断?

检查系统 `CLOSE_WAIT` 连接数:

```bash
lsof | grep CLOSE_WAIT | wc -l
```

检查指定进程 `CLOSE_WAIT` 连接数:

```bash
lsof -p $PID | grep CLOSE_WAIT | wc -l
```

## 为什么会产生大量 CLOSE_WAIT?

我们看下 TCP 四次挥手过程:

![](tcp-close.png)

主动关闭的一方发出 FIN 包，被动关闭的一方响应 ACK 包，此时，被动关闭的一方就进入了 `CLOSE_WAIT` 状态。如果一切正常，稍后被动关闭的一方也会发出 FIN 包，然后迁移到 `LAST_ACK` 状态。

通常，`CLOSE_WAIT` 状态在服务器停留时间很短，如果你发现大量的 `CLOSE_WAIT` 状态，那么就意味着被动关闭的一方没有及时发出 FIN 包，一般来说都是被动关闭的一方应用程序有问题。

### 应用没有 Close

如果 `CLOSE_WAIT` 堆积的量特别大(比如 10w+)，甚至导致文件描述符不够用了，一般就是应用没有 Close 连接导致。

当连接被关闭时，被动关闭方在代码层面没有 close 掉相应的 socket 连接，那么自然不会发出 FIN 包，从而会导致 `CLOSE_WAIT` 堆积。可能是代码里根本没写 Close，也可能是代码不严谨，出现死循环之类的问题，导致即便后面写了 close 也永远执行不到。

### 应用迟迟不 accept 连接

如果 `CLOSE_WAIT` 堆积的量不是很大，可能是全连接队列 (accept queue) 堆积了。我们先看下 TCP 连接建立的过程:

![](tcp-queue.png)

连接建立好之后会被放入 accept queue，等待应用 accept，如果应用迟迟没有从队列里面去 accept 连接，等到 client 超时时间，主动关闭了连接，这时连接在 server 端仍在全连接队列中，状态变为 `CLOSE_WAIT`。

如果连接一直不被应用 accept 出来，内核也不会自动响应 ACK 去关闭连接的。不过这种情况的堆积量一般也不高，取决于 accept queue 的大小。