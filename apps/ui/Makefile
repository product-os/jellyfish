MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

LOGLEVEL ?= info
export LOGLEVEL
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT
SENTRY_DSN_UI ?=
FIX ?=

NODE_ARGS = --abort-on-uncaught-exception --stack-trace-limit=100
NODE_DEBUG_ARGS = $(NODE_ARGS) \
									--trace-warnings \
									--stack_trace_on_illegal

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

MATCH ?=
export MATCH

.PHONY: test
test:
	npm run test

.PHONY: dev-ui
dev-ui:
	SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) \
	NODE_ENV=development NODE_OPTIONS=--max-old-space-size=8192 \
	mkdir -p ./dist/ui && \
	./conf/env.sh && \
	cp ./env-config.js ./dist/ui/ && \
	./node_modules/.bin/webpack serve \
		--config=./webpack.config.js \
		--color

.PHONY: build-ui
build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./webpack.config.js

.PHONY: lint
lint:
	npm run lint
