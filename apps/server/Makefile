MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

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

.PHONY: start-server
start-server: LOGLEVEL = info
start-server:
	NSOLID_APP=server exec $(NODE) $(NODE_ARGS) build/index.js
