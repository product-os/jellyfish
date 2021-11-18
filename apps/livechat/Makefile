MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT
API_URL ?= $(SERVER_HOST):$(SERVER_PORT)
export API_URL
SENTRY_DSN_UI ?= https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

.PHONY: dev-livechat
dev-livechat:
	mkdir -p ./dist/livechat && \
	NODE_ENV=development PUBLIC_DIR="./" ./conf/env.sh && \
	cp ./env-config.js ./dist/livechat/ && \
	NODE_ENV=development npx webpack serve --config=./webpack.config.js --color

.PHONY: build-livechat
build-livechat:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		npm run build
