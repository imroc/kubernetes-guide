FROM centos:latest

RUN rm -f /etc/localtime \
  && ln -sv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
  && echo "Asia/Shanghai" > /etc/timezone
