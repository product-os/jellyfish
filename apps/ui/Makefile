MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

LOGLEVEL ?= info
export LOGLEVEL
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT
SENTRY_DSN_UI ?=

.PHONY: dev-ui
dev-ui:
	mkdir -p ./dist/ui && \
	SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) \
	PUBLIC_DIR="./" \
	NODE_ENV=development \
	NODE_OPTIONS=--max-old-space-size=8192 \
	./conf/env.sh && \
	cp ./env-config.js ./dist/ui/ && \
	./node_modules/.bin/webpack serve \
		--config=./webpack.config.js \
		--color

.PHONY: build-ui
build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./webpack.config.js
