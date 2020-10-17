MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT

NODE_ARGS = --abort-on-uncaught-exception --stack-trace-limit=100
ifeq ($(NODE_ENV),profile)
# See https://github.com/davidmarkclements/0x
NODE = 0x --open -- node
else

# Assumes nsolid-console is running on the background
ifeq ($(NODE_ENV),nsolid)
NODE = "nsolid"
NSOLID_COMMAND ?= localhost:9001
export NSOLID_COMMAND

else
NODE = "node"
endif
endif

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
