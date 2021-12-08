.PHONY: node \
	test \
	build-ui \
	build-livechat \
	start-server \
	test-integration-server \
	scrub \
	push

# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
MAKEFILE_DIR := $(patsubst %/,%,$(dir $(MAKEFILE_PATH)))

# -----------------------------------------------
# Runtime Configuration
# -----------------------------------------------

# The default postgres user is your local user
POSTGRES_USER ?= $(shell whoami)
export POSTGRES_USER
POSTGRES_PASSWORD ?=
export POSTGRES_PASSWORD
POSTGRES_PORT ?= 5432
export POSTGRES_PORT
POSTGRES_HOST ?= localhost
export POSTGRES_HOST

# silence graphile-worker logs
NO_LOG_SUCCESS = 1
export NO_LOG_SUCCESS

PORT ?= 8000
export PORT
LOGLEVEL ?= info
export LOGLEVEL
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= $(PORT)
export SERVER_PORT
METRICS_PORT ?= 9000
export METRICS_PORT
SOCKET_METRICS_PORT ?= 9001
export SOCKET_METRICS_PORT
SERVER_DATABASE ?= jellyfish
export SERVER_DATABASE
UI_PORT ?= 9000
export UI_PORT
UI_HOST ?= $(SERVER_HOST)
export UI_HOST
LIVECHAT_HOST ?= $(SERVER_HOST)
export LIVECHAT_HOST
LIVECHAT_PORT ?= 9100
export LIVECHAT_PORT
SENTRY_DSN_SERVER ?=
export SENTRY_DSN_SERVER
NODE_ENV ?= test
export NODE_ENV
REDIS_NAMESPACE ?= $(SERVER_DATABASE)
export REDIS_NAMESPACE
REDIS_PASSWORD ?=
export REDIS_PASSWORD
REDIS_PORT ?= 6379
export REDIS_PORT
REDIS_HOST ?= localhost
export REDIS_HOST
OAUTH_REDIRECT_BASE_URL ?= $(SERVER_HOST):$(UI_PORT)
export OAUTH_REDIRECT_BASE_URL
HTTP_WORKER_PORT ?= 8002
export HTTP_WORKER_PORT

AWS_ACCESS_KEY_ID ?=
export AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY ?=
export AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME ?=
export AWS_S3_BUCKET_NAME

# -----------------------------------------------
# Build Configuration
# -----------------------------------------------

# To make sure we don't silently swallow errors
NODE_ARGS = --abort-on-uncaught-exception --stack-trace-limit=100
NODE_DEBUG_ARGS = $(NODE_ARGS) \
									--trace-warnings \
									--stack_trace_on_illegal

# User parameters
SCRUB ?= 1
export SCRUB
CI ?=
export CI
VISUAL ?=
export VISUAL
NOCACHE ?=

# Set balena push --nocache flag if necessary
ifeq ($(NOCACHE),1)
NOCACHE_FLAG = --nocache
else
NOCACHE_FLAG =
endif

DOCKER_COMPOSE_FILES = --file docker-compose.yml
ifdef MONITOR
DOCKER_COMPOSE_FILES += --file docker-compose.monitor.yml
endif
ifdef SUT
DOCKER_COMPOSE_FILES += --file docker-compose.test.yml
endif

DOCKER_COMPOSE_OPTIONS = \
	$(DOCKER_COMPOSE_FILES) \
	--project-name jellyfish \
	--compatibility

ifeq ($(SCRUB),1)
SCRUB_COMMAND = ./scripts/postgres-delete-test-databases.js
else
SCRUB_COMMAND =
endif

SENTRY_DSN_UI ?=

# -----------------------------------------------
# Rules
# -----------------------------------------------

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(FILES)

test-integration-server:
	cd apps/server && make test-integration

test-e2e-%:
	FILES="'./test/e2e/$(subst test-e2e-,,$@)/**/*.spec.{js,jsx}'" make test

node:
	node $(NODE_DEBUG_ARGS) $(FILE)

# -----------------------------------------------
# Entry Points
# -----------------------------------------------

start-server: LOGLEVEL = info
start-server:
	cd apps/server && make start-server

# -----------------------------------------------
# Build
# -----------------------------------------------

build-ui:
	cd apps/ui && \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make build-ui

build-livechat:
	cd apps/livechat && \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make build-livechat

# -----------------------------------------------
# Development
# -----------------------------------------------

compose-%: docker-compose.yml
	docker-compose $(DOCKER_COMPOSE_OPTIONS) $(subst compose-,,$@)

dev-%:
	cd apps/$(subst dev-,,$@) && SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make dev-$(subst dev-,,$@)

push:
	npm run clean
	balena push jel.ly.fish.local $(NOCACHE_FLAG) \
		--env INTEGRATION_GOOGLE_MEET_CREDENTIALS=$(INTEGRATION_GOOGLE_MEET_CREDENTIALS) \
		--env INTEGRATION_BALENA_API_PRIVATE_KEY=$(INTEGRATION_BALENA_API_PRIVATE_KEY) \
		--env INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION=$(INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION) \
		--env INTEGRATION_DISCOURSE_SIGNATURE_KEY=$(INTEGRATION_DISCOURSE_SIGNATURE_KEY) \
		--env INTEGRATION_DISCOURSE_TOKEN=$(INTEGRATION_DISCOURSE_TOKEN) \
		--env INTEGRATION_DISCOURSE_USERNAME=$(INTEGRATION_DISCOURSE_USERNAME) \
		--env INTEGRATION_FLOWDOCK_SIGNATURE_KEY=$(INTEGRATION_FLOWDOCK_SIGNATURE_KEY) \
		--env INTEGRATION_FLOWDOCK_TOKEN=$(INTEGRATION_FLOWDOCK_TOKEN) \
		--env INTEGRATION_GITHUB_APP_ID=$(INTEGRATION_GITHUB_APP_ID) \
		--env INTEGRATION_GITHUB_PRIVATE_KEY=$(INTEGRATION_GITHUB_PRIVATE_KEY) \
		--env INTEGRATION_GITHUB_SIGNATURE_KEY=$(INTEGRATION_GITHUB_SIGNATURE_KEY) \
		--env INTEGRATION_GITHUB_TOKEN=$(INTEGRATION_GITHUB_TOKEN) \
		--env INTEGRATION_INTERCOM_TOKEN=$(INTEGRATION_INTERCOM_TOKEN) \
		--env INTEGRATION_OUTREACH_SIGNATURE_KEY=$(INTEGRATION_OUTREACH_SIGNATURE_KEY) \
		--env INTEGRATION_FRONT_TOKEN=$(INTEGRATION_FRONT_TOKEN) \
		--env INTEGRATION_TYPEFORM_SIGNATURE_KEY=$(INTEGRATION_TYPEFORM_SIGNATURE_KEY) \
		--env LOGLEVEL=$(LOGLEVEL) \
		--env NODE_ENV=$(NODE_ENV)

deploy-%:
	./scripts/deploy-package.js jellyfish-$(subst deploy-,,$@)
