# KEDA 方案

## 概述

KEDA 是一个开源的 Kubernetes 基于事件驱动的弹性伸缩器（参考 [KEDA 介绍](../keda/overview)）），官方内置了几十种常用的触发器，其中也包含 prometheus 触发器，即可以根据 proemtheus 中的监控数据进行伸缩。

## Prometheus 触发器使用方法

参考 [KEDA 基于 Prometheus 自定义指标的弹性伸缩](../keda/prometheus) 。

## 与 prometheus-adapter 对比

[prometheus-adapter](https://github.com/kubernetes-sigs/prometheus-adapter) 也支持相同的能力，即根据 Prometheus 中的监控指标数据进行伸缩，但相比 KEDA 的方案有以下不足：

* 每次新增自定义指标，都要改动 `prometheus-adapter`  的配置，且改配置是集中式管理的，不支持通过 CRD 管理，配置维护起来比较麻烦。
* `prometheus-adapter` 的配置语法晦涩难懂，不能直接写 `PromQL`，需要学习一下 `prometheus-adapter` 的配置语法，有一定的学习成本，而 KEDA 的 prometheus 配置则非常简单，指标可以直接写 `PromQL`。
* `prometheus-adapter` 只支持根据 Prometheus 监控数据进行伸缩，而对于 KEDA 来说，Prometheus 只是众多触发器中的一种。

综上，推荐使用 KEDA 方案。
