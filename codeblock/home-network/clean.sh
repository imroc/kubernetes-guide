#!/bin/bash

set -x

nft delete table inet proxy # 关闭时清理 nftables，避免拉不了镜像
ip rule delete fwmark 0x1 table 100
ip route delete local 0.0.0.0/0 dev lo table 100
ip -6 rule delete fwmark 0x1 table 100
ip -6 route delete local ::/0 dev lo table 100

exit 0
