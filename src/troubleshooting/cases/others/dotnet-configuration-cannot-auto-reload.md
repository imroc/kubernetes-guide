# .Net Core 配置文件无法热加载

## 问题描述

在使用 kubernetes 部署应用时, 我使用 `kubernetes` 的 `configmap` 来管理配置文件: `appsettings.json`
,  修改configmap 的配置文件后, 我来到了容器里, 通过 `cat /app/config/appsetting.json` 命令查看容器是否已经加载了最新的配置文件, 很幸运的是, 通过命令行查看容器配置发现已经处于最新状态(修改configmap后10-15s 生效),  我尝试请求应用的API, 发现API 在执行过程中使用的配置是老旧的内容, 而不是最新的内容。在本地执行应用时并未出现配置无法热更新的问题。

```bash
# 相关版本
kubernetes 版本: 1.14.2
# 要求版本大于等于 3.1
.Net core: 3.1

# 容器 os-release (并非 windows)

NAME="Debian GNU/Linux"
VERSION_ID="10"
VERSION="10 (buster)" 
VERSION_CODENAME=buster
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"

# 基础镜像:
mcr.microsoft.com/dotnet/core/sdk:3.1-buster
mcr.microsoft.com/dotnet/core/aspnet:3.1-buster-slim

```

## 问题猜想

通过命令行排查发现最新的 `configmap` 配置内容已经在容器的指定目录上更新到最新，但是应用仍然使用老旧的配置内容, 这意味着问题发生在: configmap->**容器->应用**, 容器和应用之间, 容器指定目录下的配置更新并没有触发 `.Net` 热加载机制,  那究竟是为什么没有触发配置热加载,需要深挖根本原因, 直觉猜想是: 查看 `.Net Core` 标准库的配置热加载的实现检查触发条件, 很有可能是触发的条件不满足导致应用配置无法重新加载。

## 问题排查

猜想方向是热更新的触发条件不满足, 我们熟知使用 `configmap` 挂载文件是使用[symlink](https://en.wikipedia.org/wiki/Symbolic_link)来挂载, 而非常用的物理文件系统, 在修改完 `configmap` , 容器重新加载配置后,这一过程并不会改变文件的修改时间等信息(从容器的角度看)。对此，我们做了一个实验,通过对比configmap修改前和修改后来观察配置( `appsettings.json` )在容器的属性变化(注: 均在容器加载最新配置后对比), 使用 `stat`  命令来佐证了这个细节点。

**Before:**

```bash
root@app-785bc59df6-gdmnf:/app/Config# stat appsettings.json
File: Config/appsettings.json -> ..data/appsettings.json
 Size: 35           Blocks: 0          IO Block: 4096   symbolic link
Device: ca01h/51713d    Inode: 27263079    Links: 1
Access: (0777/lrwxrwxrwx)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2020-04-25 08:21:18.490453316 +0000
Modify: 2020-04-25 08:21:18.490453316 +0000
Change: 2020-04-25 08:21:18.490453316 +0000
Birth: -
```

**After:**

```bash
root@app-785bc59df6-gdmnf:/app/Config# stat appsettings.json
 File: appsettings.json -> ..data/appsettings.json
 Size: 35           Blocks: 0          IO Block: 4096   symbolic link
Device: ca01h/51713d    Inode: 27263079    Links: 1
Access: (0777/lrwxrwxrwx)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2020-04-25 08:21:18.490453316 +0000
Modify: 2020-04-25 08:21:18.490453316 +0000
Change: 2020-04-25 08:21:18.490453316 +0000
Birth: -
```

通过标准库源码发现, `.Net core` 配置热更新机制似乎是基于文件的最后修改日期来触发的, 根据上面的前后对比显而易见,  `configmap` 的修改并没有让容器里的指定的文件的最后修改日期改变，也就未触发 `.Net` 应用配置的热加载。

## 解决办法

既然猜想基本得到证实, 由于不太熟悉这门语言, 我们尝试在网络上寻找解决办法，很幸运的是我们找到了找到了相关的内容, [fbeltrao](https://github.com/fbeltrao) 开源了一个第三方库([ConfigMapFileProvider](https://github.com/fbeltrao/ConfigMapFileProvider)) 来专门解决这个问题，**通过监听文件内容hash值的变化实现配置热加载**。 
于是, 我们在修改了项目的代码:


**Before:**
```csharp
// 配置被放在了/app/Config/ 目录下
var configPath = Path.Combine(env.ContentRootPath, "Config");
config.AddJsonFile(Path.Combine(configPath, "appsettings.json"), 
                                optional: false, 
                                reloadOnChange: true);
```

**After:**

```csharp
// 配置被放在了/app/Config/ 目录下
config.AddJsonFile(ConfigMapFileProvider.FromRelativePath("Config"),
                        "appsettings.json",
                        optional: false,
                        reloadOnChange: true);
```

修改完项目的代码后, 重新构建镜像, 更新部署在 `kubernetes` 上的应用, 然后再次测试, 到此为止, 会出现两种状态:

1. 一种是你热加载配置完全可用, 非常值得祝贺, 你已经成功修复了这个bug; 
2. 一种是你的热加载配置功能还存在 bug, 比如: 上一次请求, 配置仍然使用的老旧配置内容, 下一次请求却使用了最新的配置内容,这个时候, 我们需要继续向下排查: `.NET Core` 引入了`Options`模式，使用类来表示相关的设置组,用强类型的类来表达配置项(白话大概表述为: 代码里面有个对象对应配置里的某个字段, 配置里对应的字段更改会触发代码里对象的属性变化), 示例如下:

**配置示例:**
```bash
cat appsettings.json
 "JwtIssuerOptions": {
    "Issuer": "test",
    "Audience": "test",
    "SecretKey": "test"
    ...
  }
```

**代码示例:**

```csharp
services.Configure<JwtIssuerOptions>(Configuration.GetSection("JwtIssuerOptions"));
```

而 Options 模式分为三种:

1. `IOptions`: Singleton(单例)，值一旦生成, 除非通过代码的方式更改，否则它的值不会更新
2. `IOptionsMonitor`: Singleton(单例), 通过IOptionsChangeTokenSource<> 能够和配置文件一起更新，也能通过代码的方式更改值
3. `IOptionsSnapshot`: Scoped，配置文件更新的下一次访问，它的值会更新，但是它不能跨范围通过代码的方式更改值，只能在当前范围（请求）内有效。

在知道这三种模式的意义后，我们已经完全找到了问题的根因, 把 `Options` 模式设置为:`IOptionsMonitor`就能解决完全解决配置热加载的问题。

## 相关链接

1. [配置监听ConfigMapFileProvider](https://github.com/fbeltrao/ConfigMapFileProvider)
2. [相似的Issue: 1175](https://github.com/dotnet/extensions/issues/1175)
3. [官方Options 描述](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-3.1)
4. [IOptions、IOptionsMonitor以及IOptionsSnapshot 测试](https://www.cnblogs.com/wenhx/p/ioptions-ioptionsmonitor-and-ioptionssnapshot.html)