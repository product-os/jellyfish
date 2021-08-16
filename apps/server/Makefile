MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

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

CI ?=
export CI
AVA_ARGS = $(AVA_OPTS)
ifndef CI
AVA_ARGS += --fail-fast
endif

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

FILES ?= "'./test/**/*.spec.js'"

.PHONY: lint
lint:
	npx eslint --ext .js $(ESLINT_OPTION_FIX) lib test
	npx depcheck --ignore-bin-package --ignores='depcheck,nodemon,@types/node'

.PHONY: test
test:
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

.PHONY: test-unit
test-unit:
	make test FILES="'./test/unit/**/*.spec.js'"

.PHONY: test-integration
test-integration:
	make test FILES="'./test/integration/**/*.spec.js'"

.PHONY: start-server
start-server: LOGLEVEL = info
start-server:
	NSOLID_APP=server exec $(NODE) $(NODE_ARGS) lib/index.js
