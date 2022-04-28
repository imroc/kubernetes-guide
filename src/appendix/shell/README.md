# 实用脚本

## 测试对比 CPU 性能

看计算圆周率耗时，耗时越短说明 CPU 性能越强:

```bash
time echo "scale=5000; 4*a(1)"| bc -l -q
```