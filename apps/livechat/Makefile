MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT
SENTRY_DSN_UI ?= https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139
FIX ?=

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

.PHONY: dev-livechat
dev-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) \
	NODE_ENV=development \
	mkdir -p ./dist/livechat && \
	./conf/env.sh && \
	cp ./env-config.js ./dist/livechat/ && \
	./node_modules/.bin/webpack serve \
		--config=./webpack.config.js \
		--color

.PHONY: build-livechat
build-livechat:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		npm run build

.PHONY: lint
lint:
	npm run lint
