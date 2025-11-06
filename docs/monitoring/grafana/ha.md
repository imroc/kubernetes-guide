# Grafana 高可用部署

## 概述

Grafana 默认安装是单副本，非高可用部署，而 Grafana 自身是支持多副本高可用部署的，本文介绍其配置方法以及已经安装的 Grafana 如何迁移到高可用架构。

## 修改配置

要让 Grafana 支持高可用，需要对 Grafana 配置文件 (`grafana.ini`) 进行一些关键的修改:

1. Grafana 默认使用 sqlite3 文件存储数据，多副本共享可能会有数据冲突，可以配置一下 `database` 让多副本共享同一个 mysql 或 postgres 数据库，这样多副本就可以无状态横向伸缩。
2. Grafana 多副本运行，如果配置了告警规则，每个副本都会重复告警，配置一下 `ha_peers` 让 Grafana 自行选主只让其中一个副本执行告警。

```ini
[database]
url = mysql://root:123456@mysql.db.svc.cluster.local:3306/grafana
[unified_alerting]
enabled = true
ha_peers = monitoring-grafana-headless.svc.monitoring.cluster.local:9094
[alerting]
enabled = false
```

* `database` 下配置数据库连接信息，包含数据库类型、用户名、密码、数据库地址、端口以及要具体哪个库。
* `alerting` 的 `enabled` 置为 false，表示禁用默认的告警方式(每个 Grafana 实例都单独告警)。
* `unified_alerting` 的 `enabled` 置为 true，表示开启高可用告警。
* `unified_alerting` 的 `ha_peers` 填入 Grafana 所有实例的地址，在 k8s 环境可用 headless service，dns 会自动解析到所有 pod ip 来实现自动发现 Grafana 所有 IP，端口默认是 9094，用于 gossip 协议实现高可用。

## helm chart 配置示例

如果 grafana 安装到 Kubernetes，通常使用 helm chart 来安装，一般是 [grafana 官方 chart](https://github.com/grafana/helm-charts/tree/main/charts/grafana)，`values.yaml` 配置示例:

```yaml
replicas: 2
defaultDashboardsTimezone: browser
grafana.ini:
  unified_alerting:
    enabled: true
    ha_peers: 'monitoring-grafana-headless.monitoring.svc.cluster.local:9094'
  alerting:
    enabled: false
  database:
    url: 'mysql://root:123456@mysql.db.svc.cluster.local:3306/grafana'
  server:
    root_url: "https://grafana.imroc.cc"
  paths:
    data: /var/lib/grafana/
    logs: /var/log/grafana
    plugins: /var/lib/grafana/plugins
    provisioning: /etc/grafana/provisioning
  analytics:
    check_for_updates: true
  log:
    mode: console
  grafana_net:
    url: https://grafana.net
```

* `grafana.ini` 字段用于修改 grafana 配置文件内容，使用 `yaml` 格式定义，会自动转成 `ini`。
* `ha_peers` 指向的 headless service 自行提前创建（当前 chart 内置的 headless 没暴露 9094 端口）。

headless service 示例:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: monitoring-grafana-headless
  namespace: monitoring
spec:
  clusterIP: None
  ports:
  - name: http-web
    port: 3000
    protocol: TCP
    targetPort: 3000
  - name: alert
    port: 9094
    protocol: TCP
    targetPort: 9094
  selector:
    app.kubernetes.io/instance: monitoring
    app.kubernetes.io/name: grafana
  type: ClusterIP
```

如果你使用的 [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) 安装，实际也是用的 Grafana 官方的 chart，只不过作为了一个子 chart，写 `values.yaml` 时将上面准备的配置放到 `grafana` 字段下面即可:

```yaml
grafana:
  replicas: 2
  defaultDashboardsTimezone: browser
  grafana.ini:
   ...
```

## 已安装的 Grafana 如何迁移到高可用架构 ？

如果你用的默认安装，使用 sqlite3 文件存储数据，可以先按照如下步骤迁移数据:

1. 拿到 `grafana.db` 文件，使用 Grafana 官方提供的迁移脚本 [sqlitedump.sh](https://github.com/grafana/database-migrator) 将 sqlite3 的数据转换成 sql 文件:
    ```bash
    sqlitedump.sh grafana.db > grafana.sql
    ```
    > 确保环境中安装了 sqlite3 命令。
2. 停止 Grafana （如果是 K8S 部署，可以修改副本数为 0)。
3. 准备好数据库，提前创建好 grafana database:
    ```sql
    CREATE DATABASE grafana;
    ```
4. 替换 Grafana 配置文件，参考前面的配置示例。
5. 启动 Grafana，让 Grafana 自动初始化数据库。
6. 将 sql 文件导入数据库执行:
    ```bash
    mysql -h172.16.181.186 -P3306 -uroot -p123456 grafana < grafana.sql
    ```
7. 恢复 Grafana 运行。

## 参考资料

- [Set up Grafana for high availability](https://grafana.com/docs/grafana/latest/setup-grafana/set-up-for-high-availability/)