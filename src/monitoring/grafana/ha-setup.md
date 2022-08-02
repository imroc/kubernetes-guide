# Grafana 高可用部署

## 概述

Grafana 默认安装是单副本，非高可用部署，而 Grafana 自身是支持多副本高可用部署的，本文介绍其配置方法以及已经安装的 Grafana 如何迁移到高可用架构。

## 修改配置

要让 Grafana 支持高可用，需要对 Grafana 配置文件 (`grafana.ini`) 进行一些关键的修改:

1. Grafana 默认使用 sqlite3 文件存储数据，多副本共享可能会有数据冲突，可以配置一下 `database` 让多副本共享同一个 mysql 或 postgres 数据库，这样多副本就可以无状态横向伸缩。
2. Grafana 多副本运行，如果配置了告警规则，每个副本都会重复告警，配置一下 `ha_peers` 让 Grafana 自行选主只让其中一个副本执行告警。

```ini
[database]
url = mysql://root:mypassword@mysql.db.svc.cluster.local:3306/grafana
[unified_alerting]
ha_peers=
```

## 参考资料

- [Set up Grafana for high availability](https://grafana.com/docs/grafana/latest/setup-grafana/set-up-for-high-availability/)