SHELL := /bin/bash

start:
	npm run start
install:
	npm install
outdated:
	npm outdated
init: install
	git clone --depth=1 git@gitee.com:imroc/kubernetes-guide.git build
gen:
	npx docusaurus build --out-dir=./build/out
push:
	cd build && git add -A && git commit -m update && git push
update: install gen push
