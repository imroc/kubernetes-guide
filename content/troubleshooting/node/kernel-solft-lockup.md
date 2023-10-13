# soft lockup (内核软死锁)

## 内核报错

``` log
Oct 14 15:13:05 VM_1_6_centos kernel: NMI watchdog: BUG: soft lockup - CPU#5 stuck for 22s! [runc:[1:CHILD]:2274]
```

## 原因

发生这个报错通常是内核繁忙 (扫描、释放或分配大量对象)，分不出时间片给用户态进程导致的，也伴随着高负载，如果负载降低报错则会消失。

## 什么情况下会导致内核繁忙

* 短时间内创建大量进程 (可能是业务需要，也可能是业务bug或用法不正确导致创建大量进程)

## 参考资料

* [What are all these "Bug: soft lockup" messages about](https://www.suse.com/support/kb/doc/?id=7017652)
