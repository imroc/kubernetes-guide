# 使用 Maven 构建 Java 容器镜像

本文介绍如果在容器环境将 Maven 项目构建成 Java 容器镜像，完整示例源码请参考 Github [maven-docker-example](https://github.com/imroc/maven-docker-example)。

## pom.xml

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

## Dockerfile

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