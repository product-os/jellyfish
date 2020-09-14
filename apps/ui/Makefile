MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SENTRY_DSN_UI ?=
SERVER_HOST ?= http://api.ly.fish.local
export SERVER_HOST
SERVER_PORT ?= 80
export SERVER_PORT

.PHONY: lint
lint:
	npx depcheck --ignore-bin-package --ignores='css-loader,@ava/babel,@babel/*,@emotion/*,babel-loader,browser-env,canvas,depcheck,file-loader,node-hook,redux-mock-store,style-loader,webpack-cli,webpack-dev-server,history'

.PHONY: dev
dev:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) NODE_ENV=development npx webpack-dev-server --config=./webpack.config.js --color

.PHONY: build
build:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) npx webpack --config=./webpack.config.js
