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

* 现象：java 应用创建大量线程。
* 根因：低版本 jdk，无法正确识别 cgroup 的 limit，所以 cpu 的数量及内存的大小是直接从宿主机获取的，跟 cgroup 里的 limit 不一致。
* 解决方案：业务升级 jdk 版本。

## 使用 Maven 构建 Java 容器镜像
本文介绍如果在容器环境将 Maven 项目构建成 Java 容器镜像，完整示例源码请参考 Github [maven-docker-example](https://github.com/imroc/maven-docker-example)。

### pom.xml

以下是 maven `pom.xml` 示例:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>org.example</groupId>
    <artifactId>http</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <!-- 指定 maven 编译时用的 jdk 版本，与 maven 基础镜像中的版本一致 -->
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>

    <build>
        <!-- 指定项目最终生成的 jar 文件名，建议固定下来，方便在 Dockerfile 中 COPY 固定文件名 -->
        <finalName>app</finalName>
        <plugins>
            <plugin>
                <!-- 将项目源码编译成一个可执行 jar 包 -->
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <configuration>
                    <archive>
                        <manifest>
                            <!-- 运行 jar 包时运行的主类，要求类全名 -->
                            <mainClass>org.example.http.HttpTest</mainClass>
                            <!-- 是否指定项目 classpath 下的依赖 -->
                            <addClasspath>true</addClasspath>
                            <!-- 指定依赖的时候声明前缀 -->
                            <classpathPrefix>./lib/</classpathPrefix>
                            <!-- 依赖是否使用带有时间戳的唯一版本号，如:xxx-1.3.0-20121225.012733.jar -->
                            <useUniqueVersions>false</useUniqueVersions>
                        </manifest>
                    </archive>
                </configuration>
            </plugin>
            <plugin>
                <!-- 利用 maven-dependency-plugin 把当前项目的所有依赖放到 target 目录下的 lib 文件夹下 -->
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-dependency-plugin</artifactId>
                <executions>
                    <execution>
                        <id>copy</id>
                        <phase>package</phase>
                        <goals>
                            <goal>copy-dependencies</goal>
                        </goals>
                        <configuration>
                            <outputDirectory>${project.build.directory}/lib</outputDirectory>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>

    <dependencies>
        <dependency>
            <groupId>org.apache.httpcomponents.client5</groupId>
            <artifactId>httpclient5</artifactId>
            <version>5.1.3</version>
        </dependency>
    </dependencies>

</project>
```

关键点:
* 利用 `maven-dependency-plugin` 插件将所有依赖 jar 包拷贝到 `./lib` 下。
* 利用 `maven-jar-plugin` 插件在打包 jar 时指定 main 函数所在 Class，让 jar 可执行；将依赖包放到 jar 包相对路径的 `./lib` 下并自动加上 `CLASSPATH`。

### Dockerfile

以下是用于构建镜像的 `Dockerfile` 示例:

```dockerfile
FROM docker.io/library/maven:3.8-jdk-11 AS build

COPY src /app/src
COPY pom.xml /app

RUN mvn -f /app/pom.xml clean package

FROM openjdk:11-jre-slim
COPY --from=build /app/target/app.jar /app/app.jar
COPY --from=build /app/target/lib /app/lib
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

关键点:
* 利用多阶段构建，只将生成的 jar 包及其依赖拷贝到最终镜像中，减小镜像体积。
* 镜像指定启动命令，给 `java` 指定要运行的 jar 包。

## 参考资料

* [JDK 8u191 Update Release Notes ](https://www.oracle.com/java/technologies/javase/8u191-relnotes.html)
* [Docker support in Java 8 — finally!](https://blog.softwaremill.com/docker-support-in-new-java-8-finally-fd595df0ca54)
* [Better Containerized JVMs in JDK10](http://blog.gilliard.lol/2018/01/10/Java-in-containers-jdk10.html)
* [JVM in a Container](https://merikan.com/2019/04/jvm-in-a-container/#java-8u131-and-java-9)
* [14 best practices for containerising your Java applications](https://www.tutorialworks.com/docker-java-best-practices/)
* [Best Practices: Java Memory Arguments for Containers](https://dzone.com/articles/best-practices-java-memory-arguments-for-container)
