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

AVA_ARGS = $(AVA_OPTS)
ifndef CI
AVA_ARGS += --fail-fast
endif
ifdef MATCH
AVA_ARGS += --match $(MATCH)
endif

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

.PHONY: test
test: LOGLEVEL = warning
test:
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) "'./**/*.spec.{js,jsx}'"

.PHONY: dev-ui
dev-ui:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	NODE_ENV=development \
	./node_modules/.bin/webpack-dev-server \
		--config=./lib/webpack.config.js \
		--color

.PHONY: start-static-ui
start-static-ui:
	cd dist/ui && python2 -m SimpleHTTPServer $(SERVER_PORT)

.PHONY: build-dev-ui
build-dev-ui:
	NODE_ENV=development API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./lib/webpack.config.js

.PHONY: build-ui
build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./lib/webpack.config.js

.PHONY: lint
lint:
	npx eslint --ext .js,.jsx $(ESLINT_OPTION_FIX) lib test
	npx depcheck --ignore-bin-package --ignores='@ava/babel,@babel/*,canvas,history,depcheck,css-loader,file-loader,babel-loader,style-loader'
