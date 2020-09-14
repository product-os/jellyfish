MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://api.ly.fish.local
export SERVER_HOST
SERVER_PORT ?= 80
export SERVER_PORT

.PHONY: lint
lint:
	npx depcheck --ignore-bin-package --ignores='css-loader,@babel/*,babel-loader,depcheck,file-loader,style-loader,webpack-cli,webpack-dev-server'

.PHONY: build
build:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		npx webpack --config=./webpack.config.js

.PHONY: dev
dev:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) NODE_ENV=development \
		npx webpack-dev-server --config=./webpack.config.js --color
