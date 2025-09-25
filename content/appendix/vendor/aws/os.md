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
```
