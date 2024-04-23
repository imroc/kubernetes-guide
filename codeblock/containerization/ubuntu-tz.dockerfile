FROM ubuntu:latest

RUN apt update -y && \
  DEBIAN_FRONTEND="noninteractive" apt -y install tzdata
RUN ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata
