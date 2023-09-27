# 在 SHELL 中传递信号

在 Kubernetes 中，Pod 停止时 kubelet 会先给容器中的主进程发 `SIGTERM` 信号来通知进程进行 shutdown 以实现优雅停止，如果超时进程还未完全停止则会使用 `SIGKILL` 来强行终止。

但有时我们会遇到一种情况: 业务逻辑处理了 `SIGTERM` 信号，但 Pod 停止时好像没收到信号导致优雅停止逻辑不生效。

通常是因为我们的业务进程是在脚本中启动的，容器的启动入口使用了脚本，所以容器中的主进程并不是我们所希望的业务进程而是 shell 进程，导致业务进程收不到 `SIGTERM` 信号，更详细的原因在上一节我们已经介绍了，下面将介绍几种解决方案。

## 使用 exec 启动

在 shell 中启动二进制的命令前加一个 [exec](https://stackoverflow.com/questions/18351198/what-are-the-uses-of-the-exec-command-in-shell-scripts) 即可让该二进制启动的进程代替当前 shell 进程，即让新启动的进程成为主进程:

```bash
#! /bin/bash
...

exec /bin/yourapp # 脚本中执行二进制
```

然后业务进程就可以正常接收所有信号了，实现优雅退出也不在话下。

## 多进程场景: 使用 trap 传递信号

通常我们一个容器只会有一个进程，也是 Kubernetes 的推荐做法。但有些时候我们不得不启动多个进程，比如从传统部署迁移到 Kubernetes 的过渡期间，使用了富容器，即单个容器中需要启动多个业务进程，这时也只能通过 shell 启动，但无法使用上面的 `exec` 方式来传递信号，因为 `exec` 只能让一个进程替代当前 shell 成为主进程。

这个时候我们可以在 shell 中使用 `trap` 来捕获信号，当收到信号后触发回调函数来将信号通过 `kill` 传递给业务进程，脚本示例:

```bash
#! /bin/bash

/bin/app1 & pid1="$!" # 启动第一个业务进程并记录 pid
echo "app1 started with pid $pid1"

/bin/app2 & pid2="$!" # 启动第二个业务进程并记录 pid
echo "app2 started with pid $pid2"

handle_sigterm() {
  echo "[INFO] Received SIGTERM"
  kill -SIGTERM $pid1 $pid2 # 传递 SIGTERM 给业务进程
  wait $pid1 $pid2 # 等待所有业务进程完全终止
}
trap handle_sigterm SIGTERM # 捕获 SIGTERM 信号并回调 handle_sigterm 函数

wait # 等待回调执行完，主进程再退出
```

## 完美方案: 使用 init 系统

前面一种方案实际是用脚本实现了一个极简的 init 系统 (或 supervisor) 来管理所有子进程，只不过它的逻辑很简陋，仅仅简单的透传指定信号给子进程，其实社区有更完善的方案，[dumb-init](https://github.com/Yelp/dumb-init) 和 [tini](https://github.com/krallin/tini) 都可以作为 init 进程，作为主进程 (PID 1) 在容器中启动，然后它再运行 shell 来执行我们指定的脚本 (shell 作为子进程)，shell 中启动的业务进程也成为它的子进程，当它收到信号时会将其传递给所有的子进程，从而也能完美解决 SHELL 无法传递信号问题，并且还有回收僵尸进程的能力。

这是以 `dumb-init` 为例制作镜像的 `Dockerfile` 示例:

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y dumb-init
ADD start.sh /
ADD app1 /bin/app1
ADD app2 /bin/app2
ENTRYPOINT ["dumb-init", "--"]
CMD ["/start.sh"]
```

这是以 `tini` 为例制作镜像的 `Dockerfile` 示例:

```dockerfile
FROM ubuntu:22.04
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /tini /entrypoint.sh
ENTRYPOINT ["/tini", "--"]
CMD [ "/start.sh" ]
```

`start.sh` 脚本示例:

```bash
#! /bin/bash
/bin/app1 &
/bin/app2 &
wait
```

## 参考资料

* [Trapping signals in Docker containers](https://medium.com/@gchudnov/trapping-signals-in-docker-containers-7a57fdda7d86)
* [Gracefully Stopping Docker Containers](https://www.ctl.io/developers/blog/post/gracefully-stopping-docker-containers/)
* [Why Your Dockerized Application Isn’t Receiving Signals](https://hynek.me/articles/docker-signals/)
* [Best practices for propagating signals on Docker](https://www.kaggle.com/residentmario/best-practices-for-propagating-signals-on-docker)
* [Graceful shutdowns with ECS](https://aws.amazon.com/cn/blogs/containers/graceful-shutdowns-with-ecs/)