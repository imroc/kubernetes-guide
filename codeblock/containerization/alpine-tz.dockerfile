FROM alpine:latest

# 安装 tzdata，复制里面的时区文件后删除 tzdata，保持精简
RUN apk add --no-cache tzdata && \
  cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  apk del tzdata && \
  echo "Asia/Shanghai" > /etc/timezone
