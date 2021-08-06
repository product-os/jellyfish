MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= 8000
export SERVER_PORT
SENTRY_DSN_UI ?=
FIX ?=

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

.PHONY: dev-livechat
dev-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	NODE_ENV=development \
	./node_modules/.bin/webpack serve \
		--config=./webpack.config.js \
		--color

.PHONY: build-livechat
build-livechat:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./webpack.config.js

.PHONY: lint
lint:
	npm run lint
