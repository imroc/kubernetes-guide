# EKS 的 OS

## Amazon Linux 2023（x86_64）标准版 (AL2023_x86_64_STANDARD)

```bash
$ cat /etc/os-release
NAME="Amazon Linux"
VERSION="2023"
ID="amzn"
ID_LIKE="fedora"
VERSION_ID="2023"
PLATFORM_ID="platform:al2023"
PRETTY_NAME="Amazon Linux 2023.8.20250915"
ANSI_COLOR="0;33"
CPE_NAME="cpe:2.3:o:amazon:amazon_linux:2023"
HOME_URL="https://aws.amazon.com/linux/amazon-linux-2023/"
DOCUMENTATION_URL="https://docs.aws.amazon.com/linux/"
SUPPORT_URL="https://aws.amazon.com/premiumsupport/"
BUG_REPORT_URL="https://github.com/amazonlinux/amazon-linux-2023"
VENDOR_NAME="AWS"
VENDOR_URL="https://aws.amazon.com/"
SUPPORT_END="2029-06-30"
$ uname -a
Linux ip-172-31-12-75.us-east-2.compute.internal 6.12.40-64.114.amzn2023.x86_64 #1 SMP PREEMPT_DYNAMIC Tue Aug 26 05:26:24 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux
$ lsmod
Module                  Size  Used by
veth                   40960  0
xt_state               12288  0
xt_connmark            12288  5
xt_nat                 12288  1
ip6t_REJECT            12288  1
nf_reject_ipv6         24576  1 ip6t_REJECT
ipt_REJECT             12288  1
nf_reject_ipv4         16384  1 ipt_REJECT
xt_MASQUERADE          16384  2
xt_mark                12288  4
xt_addrtype            12288  4
xt_set                 20480  16
ip_set_hash_ipportnet    57344  2
ip_set_hash_ip         49152  2
ip_set_bitmap_port     20480  10
ip_set_hash_ipport     49152  16
ip_set_hash_ipportip    49152  4
dummy                  12288  0
nft_chain_nat          12288  7
ip_vs_rr               12288  4
ip_set                 65536  6 ip_set_hash_ipportnet,ip_set_bitmap_port,ip_set_hash_ip,xt_set,ip_set_hash_ipport,ip_set_hash_ipportip
ip_vs                 229376  6 ip_vs_rr
xt_conntrack           12288  5
xt_comment             12288  38
nft_compat             24576  77
nf_tables             385024  158 nft_compat,nft_chain_nat
nfnetlink              20480  3 nft_compat,nf_tables,ip_set
overlay               217088  9
nls_ascii              12288  1
nls_cp437              16384  1
vfat                   28672  1
fat                   102400  1 vfat
sunrpc                868352  1
skx_edac_common        28672  0
ghash_clmulni_intel    16384  0
i8042                  45056  0
serio                  28672  3 i8042
ena                   208896  0
button                 24576  0
sch_fq_codel           20480  5
iptable_nat            12288  0
nf_nat                 65536  4 xt_nat,nft_chain_nat,iptable_nat,xt_MASQUERADE
nf_conntrack          200704  7 xt_conntrack,nf_nat,xt_state,xt_nat,xt_connmark,xt_MASQUERADE,ip_vs
nf_defrag_ipv6         24576  2 nf_conntrack,ip_vs
nf_defrag_ipv4         12288  1 nf_conntrack
dm_mod                217088  0
fuse                  221184  1
loop                   36864  0
configfs               65536  1
dax                    57344  1 dm_mod
dmi_sysfs              20480  0
crc32_pclmul           12288  0
crc32c_intel           16384  0
efivarfs               24576  1
```
