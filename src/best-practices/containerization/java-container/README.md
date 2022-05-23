# Java 应用容器化

本文介绍 Java 应用容器化相关注意事项。

## 避免低版本 JDK

JDK 低版本对容器不友好，感知不到自己在容器内:
1. 不知道被分配了多少内存，很容易造成消耗过多内容而触发 Cgroup OOM 被杀死。
2. 不知道被分配了多少 CPU，认为可用 CPU 数量就是宿主机的 CPU 数量，导致 JVM 创建过多线程，容易高负载被 Cgroup CPU 限流(throttle)。

在高版本的 JDK 中 (JDK10) 对容器进行了很好的支持，同时也 backport 到了低版本 (JDK8):
1. 如果使用的 `Oracle JDK`，确保版本大于等于 `8u191`。
2. 如果使用的 `OpenJDK`，确保版本大于等于 `8u212`。

## 常见问题

### 相同镜像在部分机器上跑有问题

* 现象: 经常会有人说，我的 java 容器镜像，在 A 机器上跑的好好的，在 B 机器上就有问题，都是用的同一个容器镜像啊。
* 根因：java 类加载的顺序问题，如果有不同版本的重复 jar 包，只会加载其中一个，并且不保证顺序。
* 解决方案：业务去掉重复的 jar 包。
* 类似 case 的分析文章：[关于Jar加载顺序的问题分析](https://www.jianshu.com/p/dcad5330b06f)

### java 默认线程池的线程数问题

现象：java 应用创建大量线程。
根因：低版本 jdk，无法正确识别 cgroup 的 limit，所以 cpu 的数量及内存的大小是直接从宿主机获取的，跟 cgroup 里的 limit 不一致。
解决方案：业务升级 jdk 版本。

## 参考资料

* [JDK 8u191 Update Release Notes ](https://www.oracle.com/java/technologies/javase/8u191-relnotes.html)
* [Docker support in Java 8 — finally!](https://blog.softwaremill.com/docker-support-in-new-java-8-finally-fd595df0ca54)
* [Better Containerized JVMs in JDK10](http://blog.gilliard.lol/2018/01/10/Java-in-containers-jdk10.html)
* [JVM in a Container](https://merikan.com/2019/04/jvm-in-a-container/#java-8u131-and-java-9)
* [14 best practices for containerising your Java applications](https://www.tutorialworks.com/docker-java-best-practices/)
* [Best Practices: Java Memory Arguments for Containers](https://dzone.com/articles/best-practices-java-memory-arguments-for-container)