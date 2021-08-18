MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

FIX ?=

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

.PHONY: test
test:
	npm run test

.PHONY: lint
lint:
	npm run lint

.PHONY: start-worker
start-worker: LOGLEVEL = info
start-worker:
	NSOLID_APP=worker exec $(NODE) $(NODE_ARGS) build/worker.js
