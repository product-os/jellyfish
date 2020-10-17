MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

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

.PHONY: lint
lint:
	npx depcheck --ignore-bin-package --ignores='depcheck'

.PHONY: start-worker
start-worker: LOGLEVEL = info
start-worker:
	NSOLID_APP=worker exec $(NODE) $(NODE_ARGS) lib/worker.js

.PHONY: start-tick
start-tick: LOGLEVEL = info
start-tick:
	NSOLID_APP=tick exec $(NODE) $(NODE_ARGS) lib/tick.js
