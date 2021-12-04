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

# Project name
NAME ?= jellyfish

DATABASE ?= postgres
export DATABASE

# The default postgres user is your local user
POSTGRES_USER ?= $(shell whoami)
export POSTGRES_USER
POSTGRES_PASSWORD ?=
export POSTGRES_PASSWORD
POSTGRES_PORT ?= 5432
export POSTGRES_PORT
POSTGRES_HOST ?= localhost
export POSTGRES_HOST
POSTGRES_DATABASE ?= jellyfish
export POSTGRES_DATABASE

# silence graphile-worker logs
NO_LOG_SUCCESS = 1
export NO_LOG_SUCCESS

PORT ?= 8000
export PORT
LOGLEVEL ?= info
export LOGLEVEL
DB_HOST ?= localhost
export DB_HOST
DB_PORT ?= 28015
export DB_PORT
DB_USER ?=
export DB_USER
DB_PASSWORD ?=
export DB_PASSWORD
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
DB_CERT ?=
export DB_CERT
LOGENTRIES_TOKEN ?=
export LOGENTRIES_TOKEN
LOGENTRIES_REGION ?=
export LOGENTRIES_REGION
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
POD_NAME ?= localhost
export POD_NAME
OAUTH_REDIRECT_BASE_URL ?= $(SERVER_HOST):$(UI_PORT)
export OAUTH_REDIRECT_BASE_URL
MONITOR_SECRET_TOKEN ?= TEST
export MONITOR_SECRET_TOKEN
RESET_PASSWORD_SECRET_TOKEN ?=
export RESET_PASSWORD_SECRET_TOKEN
HTTP_WORKER_PORT ?= 8002
export HTTP_WORKER_PORT

FS_DRIVER ?= localFS
export FS_DRIVER
AWS_ACCESS_KEY_ID ?=
export AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY ?=
export AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME ?=
export AWS_S3_BUCKET_NAME
INTEGRATION_DEFAULT_USER ?= admin
export INTEGRATION_DEFAULT_USER

# Automatically created user
# when not running in production
TEST_USER_USERNAME ?= jellyfish
export TEST_USER_USERNAME
TEST_USER_PASSWORD ?= jellyfish
export TEST_USER_PASSWORD
TEST_USER_ROLE ?= user-test
export TEST_USER_ROLE
TEST_USER_ORGANIZATION ?= balena
export TEST_USER_ORGANIZATION

MAILGUN_TOKEN ?=
export MAILGUN_TOKEN

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
	--project-name $(NAME) \
	--compatibility

ifeq ($(SCRUB),1)
SCRUB_COMMAND = ./scripts/postgres-delete-test-databases.js
else
SCRUB_COMMAND =
endif

SENTRY_DSN_UI ?=

AVA_ARGS = $(AVA_OPTS)
ifndef CI
AVA_ARGS += --fail-fast
endif

# -----------------------------------------------
# Rules
# -----------------------------------------------

.tmp:
	mkdir -p $@

.tmp/haproxy.manifest.json: haproxy.manifest.tpl.json | .tmp
	node scripts/template $< > $@

docker-compose.yml: docker-compose.tpl.yml .tmp/haproxy.manifest.json | .tmp
	HAPROXY_CONFIG=$(shell cat $(word 2,$^) | base64 | tr -d '\n') \
		node scripts/template $< > $@

docs/assets/architecture.png: docs/diagrams/architecture.mmd
	./node_modules/.bin/mmdc -i $< -o $@ -w 2560 -H 1600

ARCHITECTURE.md: scripts/architecture-summary.sh \
	apps/*/DESCRIPTION.markdown \
	docs/assets/architecture.png
	./$< > $@

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

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
		--env INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING=$(INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING) \
		--env INTEGRATION_BALENA_API_APP_ID=$(INTEGRATION_BALENA_API_APP_ID) \
		--env INTEGRATION_BALENA_API_APP_SECRET=$(INTEGRATION_BALENA_API_APP_SECRET) \
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
		--env INTEGRATION_OUTREACH_APP_ID=$(INTEGRATION_OUTREACH_APP_ID) \
		--env INTEGRATION_OUTREACH_APP_SECRET=$(INTEGRATION_OUTREACH_APP_SECRET) \
		--env INTEGRATION_OUTREACH_SIGNATURE_KEY=$(INTEGRATION_OUTREACH_SIGNATURE_KEY) \
		--env INTEGRATION_FRONT_TOKEN=$(INTEGRATION_FRONT_TOKEN) \
		--env INTEGRATION_BALENA_API_OAUTH_BASE_URL=$(INTEGRATION_BALENA_API_OAUTH_BASE_URL) \
		--env INTEGRATION_TYPEFORM_SIGNATURE_KEY=$(INTEGRATION_TYPEFORM_SIGNATURE_KEY) \
		--env TEST_INTEGRATION_SKIP=$(TEST_INTEGRATION_SKIP) \
		--env LOGLEVEL=$(LOGLEVEL) \
		--env NODE_ENV=$(NODE_ENV) \
		--env REGISTRY_TOKEN_AUTH_CERT_KEY="LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSU4xWUw1WVRjb3NVVnhHdXlXMGt4cGE0ekxzbEpGQ2JvZUxIUWlpaW1vTkhvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFR0RRQ2FpK1FnNG9GZE9HMXZNdWdtMFA5bTViSUR3R29MNjg1aGVYR0hwZWJVblgxOGQvYwpQUTZGbDBQaklQam9iUzlCNW5oSTF1Y0p3MW8vclE2UXdnPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=" \
		--env REGISTRY_TOKEN_AUTH_CERT_KID="UkNVNTo2Q1RaOkJITjc6RlBCUjpKWUJIOjVHRVI6QVdQSDpIRk9aOjZaT0c6VVUzTzo3Q0gzOjZFU0sK"

deploy-%:
	./scripts/deploy-package.js jellyfish-$(subst deploy-,,$@)
