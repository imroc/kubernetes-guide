#!/bin/bash

set -x

while :; do
	export https_proxy=http://127.0.0.1:10809                                           # 假设代理会启动 10809 端口的 HTTP 代理
	code=$(curl -I -o /dev/null -m 5 -s -w %{http_code} https://www.google.com | xargs) # 通过代理探测目标地址是否正常响应
	if [[ "${code}" == "200" ]]; then                                                   # 探测成功就退出探测循环，准备设置策略路由
		break
	fi
	echo "bad code:${code};" >/tmp/error.log
	sleep 5s
done

echo "proxy is ready, set up rules"
ip rule list | grep "from all fwmark 0x1 lookup 100"
if [ $? -ne 0 ]; then
	echo "add rule and route"
	ip rule add fwmark 0x1 table 100
	ip route add local 0.0.0.0/0 dev lo table 100
	ip -6 rule add fwmark 0x1 table 100
	ip -6 route add local ::/0 dev lo table 100
fi

nft -f /etc/nftables/nftables.conf # 设置 nftables 规则
exit 0

