MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: test-integration
test-integration:
	npm run test:integration

.PHONY: start-server
start-server: LOGLEVEL = info
start-server:
	exec node --abort-on-uncaught-exception --stack-trace-limit=100 build/index.js
