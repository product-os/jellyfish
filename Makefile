.PHONY: build-livechat

# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
MAKEFILE_DIR := $(patsubst %/,%,$(dir $(MAKEFILE_PATH)))

# -----------------------------------------------
# Runtime Configuration
# -----------------------------------------------

PORT ?= 8000
export PORT
LOGLEVEL ?= info
export LOGLEVEL
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= $(PORT)
export SERVER_PORT
UI_PORT ?= 9000
export UI_PORT
UI_HOST ?= $(SERVER_HOST)
export UI_HOST
LIVECHAT_HOST ?= $(SERVER_HOST)
export LIVECHAT_HOST
LIVECHAT_PORT ?= 9100
export LIVECHAT_PORT
NODE_ENV ?= test
export NODE_ENV
OAUTH_REDIRECT_BASE_URL ?= $(SERVER_HOST):$(UI_PORT)
export OAUTH_REDIRECT_BASE_URL
SENTRY_DSN_UI ?=

# -----------------------------------------------
# Build
# -----------------------------------------------

build-livechat:
	cd apps/livechat && \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make build-livechat

# -----------------------------------------------
# Development
# -----------------------------------------------

dev-%:
	cd apps/$(subst dev-,,$@) && SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make dev-$(subst dev-,,$@)
