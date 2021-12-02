.PHONY: lint \
	node \
	test \
	docs \
	build-ui \
	build-livechat \
	start-server \
	start-worker \
	start-redis \
	start-postgres \
	test-integration-server \
	test-e2e \
	scrub \
	npm-install \
	push \
	exec-apps

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

MAIL_TYPE ?= mailgun
export MAIL_TYPE
MAILGUN_TOKEN ?=
export MAILGUN_TOKEN
MAILGUN_DOMAIN ?= mail.ly.fish
export MAILGUN_DOMAIN
MAILGUN_BASE_URL = https://api.mailgun.net/v3
export MAILGUN_BASE_URL

# -----------------------------------------------
# Test Runtime Configuration
# -----------------------------------------------

TEST_INTEGRATION_FRONT_INBOX_1 ?= inb_qf8q # Jellyfish Testfront
export TEST_INTEGRATION_FRONT_INBOX_1
TEST_INTEGRATION_FRONT_INBOX_2 ?= inb_8t8y # Jellyfish Test Inbox
export TEST_INTEGRATION_FRONT_INBOX_2
TEST_INTEGRATION_DISCOURSE_CATEGORY ?= 44 # sandbox
export TEST_INTEGRATION_DISCOURSE_CATEGORY
TEST_INTEGRATION_DISCOURSE_USERNAME ?= jellyfish
export TEST_INTEGRATION_DISCOURSE_USERNAME
TEST_INTEGRATION_DISCOURSE_NON_MODERATOR_USERNAME ?= jellyfish-test
export TEST_INTEGRATION_DISCOURSE_NON_MODERATOR_USERNAME

# -----------------------------------------------
# Build Configuration
# -----------------------------------------------

# To make sure we don't silently swallow errors
NODE_ARGS = --abort-on-uncaught-exception --stack-trace-limit=100
NODE_DEBUG_ARGS = $(NODE_ARGS) \
									--trace-warnings \
									--stack_trace_on_illegal

# User parameters
MATCH ?=
export MATCH
SCRUB ?= 1
export SCRUB
FIX ?=
CI ?=
DETACH ?=
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

# Set dotenv variables for local development/testing
ifndef CI
    # Defaults are set in local.env
    ifneq ("$(wildcard local.env)","")
        include local.env
        export $(shell sed 's/=.*//' local.env)
    endif

    # Developers can override local.env with a custom.env
    ifneq ("$(wildcard custom.env)","")
        include custom.env
        export $(shell sed 's/=.*//' custom.env)
    endif
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
ifeq ($(DETACH),1)
DOCKER_COMPOSE_COMMAND_OPTIONS = --detach
else
DOCKER_COMPOSE_COMMAND_OPTIONS =
endif

ifeq ($(SCRUB),1)
SCRUB_COMMAND = ./scripts/postgres-delete-test-databases.js
else
SCRUB_COMMAND =
endif

SENTRY_DSN_UI ?=

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

AVA_ARGS = $(AVA_OPTS)
ifndef CI
AVA_ARGS += --fail-fast
endif
ifdef MATCH
AVA_ARGS += --match $(MATCH)
endif

# -----------------------------------------------
# Rules
# -----------------------------------------------

npm-install:
	npm install && CMD="npm install" make exec-apps

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

postgres_data:
	initdb --locale=en_US.UTF8 --pgdata $@

lint:
	./node_modules/.bin/eslint --ext .js,.jsx $(ESLINT_OPTION_FIX) scripts test
	./scripts/lint/check-filenames.sh
	./scripts/lint/check-descriptions.sh
	./scripts/lint/check-tests.sh
	./scripts/lint/check-apps.sh
	npx shellcheck ./scripts/*.sh ./scripts/*/*.sh ./deploy-templates/*.sh
	./node_modules/.bin/deplint
	./node_modules/.bin/depcheck --ignore-bin-package --ignores='@babel/*,assignment,@ava/babel,canvas,history,@balena/jellyfish-sync,@balena/jellyfish-plugin-base,@balena/jellyfish-action-library,@balena/jellyfish-plugin-default,@balena/jellyfish-plugin-product-os,@balena/jellyfish-plugin-channels,@balena/jellyfish-plugin-typeform,@balena/jellyfish-plugin-github,@balena/jellyfish-plugin-flowdock,@balena/jellyfish-plugin-discourse,@balena/jellyfish-plugin-outreach,@balena/jellyfish-plugin-front,@balena/jellyfish-plugin-balena-api,@balena/jellyfish-worker,@balena/jellyfish-queue,@balena/jellyfish-config,webpack,shellcheck'
	cd apps/server && npm run lint
	cd apps/livechat && npm run lint
	cd apps/ui && npm run lint

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

test-e2e:
	FILES="'./test/e2e/**/*.spec.{js,jsx}'" SCRUB=0 make test

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

start-redis:
	exec redis-server --port $(REDIS_PORT)

# You might need to increase the maximum amount of semaphores
# system-wide in order to set the max connections parameters.
# In OpenBSD, set kern.seminfo.semmns=200 in /etc/sysctl.conf
# See https://www.postgresql.org/docs/11/kernel-resources.html
start-postgres: postgres_data
	exec postgres -N 100 -D $< -p $(POSTGRES_PORT)

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
	docker-compose $(DOCKER_COMPOSE_OPTIONS) $(subst compose-,,$@) \
		$(DOCKER_COMPOSE_COMMAND_OPTIONS)

dev-%:
	cd apps/$(subst dev-,,$@) && SERVER_HOST=$(SERVER_HOST) SERVER_PORT=$(SERVER_PORT) make dev-$(subst dev-,,$@)

push:
	CMD="rm -f ./packages/*" make exec-apps
	balena push jel.ly.fish.local $(NOCACHE_FLAG) \
		--env INTEGRATION_DEFAULT_USER=$(INTEGRATION_DEFAULT_USER) \
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
		--env MONITOR_SECRET_TOKEN=$(MONITOR_SECRET_TOKEN) \
		--env TEST_INTEGRATION_SKIP=$(TEST_INTEGRATION_SKIP) \
		--env LOGLEVEL=$(LOGLEVEL) \
		--env NODE_ENV=$(NODE_ENV) \
		--env REGISTRY_TOKEN_AUTH_CERT_ISSUER=api.ly.fish.local \
		--env REGISTRY_TOKEN_AUTH_CERT_KEY="LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSU4xWUw1WVRjb3NVVnhHdXlXMGt4cGE0ekxzbEpGQ2JvZUxIUWlpaW1vTkhvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFR0RRQ2FpK1FnNG9GZE9HMXZNdWdtMFA5bTViSUR3R29MNjg1aGVYR0hwZWJVblgxOGQvYwpQUTZGbDBQaklQam9iUzlCNW5oSTF1Y0p3MW8vclE2UXdnPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=" \
		--env REGISTRY_TOKEN_AUTH_CERT_KID="UkNVNTo2Q1RaOkJITjc6RlBCUjpKWUJIOjVHRVI6QVdQSDpIRk9aOjZaT0c6VVUzTzo3Q0gzOjZFU0sK" \
		--env REGISTRY_TOKEN_AUTH_JWT_ALGO=ES256 \
		--env REGISTRY_HOST=registry.ly.fish.local

deploy-%:
	./scripts/deploy-package.js jellyfish-$(subst deploy-,,$@)

# Execute a command under each app directory
exec-apps:
	for app in $(shell find $(MAKEFILE_DIR)/apps -maxdepth 1 -mindepth 1 -type d | sort -g); do cd $$app && echo - $$app: && $(CMD); done

docs:
	CMD="npm run doc" make exec-apps
