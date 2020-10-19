MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT

.PHONY: dev-livechat
dev-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	NODE_ENV=development \
	./node_modules/.bin/webpack-dev-server \
		--config=./lib/webpack.config.js \
		--color

.PHONY: build-livechat
build-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./lib/webpack.config.js

.PHONY: lint
lint:
	npx depcheck --ignore-bin-package --ignores='depcheck,css-loader,file-loader,babel-loader,style-loader,@babel/core,@babel/preset-react'
