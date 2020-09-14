MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: lint
lint:
	npx depcheck --ignore-bin-package --ignores='depcheck,nodemon'
