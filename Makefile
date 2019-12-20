.PHONY: clean \
	lint \
	coverage \
	node \
	test \
	build-ui \
	build-livechat \
	start-server \
	start-worker \
	start-tick \
	start-rabbitmq \
	start-redis \
	start-postgres \
	test-unit \
	test-integration \
	test-e2e \
	scrub

# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

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

RABBITMQ_QUEUE_NAME ?= jellyfish_action_requests
export RABBITMQ_QUEUE_NAME
RABBITMQ_HOSTNAME ?= localhost
export RABBITMQ_HOSTNAME
RABBITMQ_USERNAME ?= guest
export RABBITMQ_USERNAME
RABBITMQ_PASSWORD ?= guest
export RABBITMQ_PASSWORD

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

# Front
INTEGRATION_INTERCOM_TOKEN ?=
export INTEGRATION_INTERCOM_TOKEN
INTEGRATION_FRONT_TOKEN ?=
export INTEGRATION_FRONT_TOKEN

# GitHub
INTEGRATION_GITHUB_TOKEN ?=
export INTEGRATION_GITHUB_TOKEN
INTEGRATION_GITHUB_SIGNATURE_KEY ?=
export INTEGRATION_GITHUB_SIGNATURE_KEY

# Balena API
INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION ?=
export INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION
INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING ?=
export INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING
INTEGRATION_BALENA_API_PRIVATE_KEY ?=
export INTEGRATION_BALENA_API_PRIVATE_KEY
INTEGRATION_BALENA_API_APP_ID ?=
export INTEGRATION_BALENA_API_APP_ID
INTEGRATION_BALENA_API_APP_SECRET ?=
export INTEGRATION_BALENA_API_APP_SECRET
INTEGRATION_BALENA_API_OAUTH_BASE_URL ?= https://api.balena-cloud.com
export INTEGRATION_BALENA_API_OAUTH_BASE_URL

# A Discourse API token
INTEGRATION_DISCOURSE_TOKEN ?=
export INTEGRATION_DISCOURSE_TOKEN
# The Discourse username the API token belongs to, as
# we need to pass that alongside the token every time.
INTEGRATION_DISCOURSE_USERNAME ?=
export INTEGRATION_DISCOURSE_USERNAME
# The secret set when configuring the webhooks
INTEGRATION_DISCOURSE_SIGNATURE_KEY ?=
export INTEGRATION_DISCOURSE_SIGNATURE_KEY

# Flowdock
INTEGRATION_FLOWDOCK_SIGNATURE_KEY ?=
export INTEGRATION_FLOWDOCK_SIGNATURE_KEY
INTEGRATION_FLOWDOCK_TOKEN ?=
export INTEGRATION_FLOWDOCK_TOKEN

# Outreach
INTEGRATION_OUTREACH_APP_ID ?=
export INTEGRATION_OUTREACH_APP_ID
INTEGRATION_OUTREACH_APP_SECRET ?=
export INTEGRATION_OUTREACH_APP_SECRET
INTEGRATION_OUTREACH_SIGNATURE_KEY ?=
export INTEGRATION_OUTREACH_SIGNATURE_KEY

# -----------------------------------------------
# Test Runtime Configuration
# -----------------------------------------------

TEST_INTEGRATION_GITHUB_REPO ?= balena-io/jellyfish-test-github
export TEST_INTEGRATION_GITHUB_REPO
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

ifeq ($(NODE_ENV),profile)
# See https://github.com/davidmarkclements/0x
NODE = 0x --open -- node
else
NODE = "node"
endif

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
COVERAGE ?= 0
export COVERAGE

DOCKER_COMPOSE_OPTIONS = \
	--file docker-compose.yml \
	--project-name $(NAME) \
	--compatibility
ifeq ($(DETACH),1)
DOCKER_COMPOSE_COMMAND_OPTIONS = --detach
else
DOCKER_COMPOSE_COMMAND_OPTIONS =
endif

ifeq ($(SCRUB),1)
SCRUB_COMMAND = ./scripts/postgres-delete-test-databases.js && ./scripts/rabbitmq-delete-test-queues.js
else
SCRUB_COMMAND =
endif

SENTRY_DSN_UI ?=

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
endif

NYC_TMP_DIR = .nyc-root
NYC_GLOBAL_OPS = --extension .js --extension .jsx --extension .json --extension .svg
NYC_OPTS = $(NYC_GLOBAL_OPS) --exclude '**/*.spec.js' --exclude '**/*.spec.jsx' --compact=false
ifeq ($(COVERAGE),1)
COVERAGE_COMMAND = ./node_modules/.bin/nyc --no-clean $(NYC_OPTS) --exclude 'test/e2e/ui/macros.js'
else
COVERAGE_COMMAND =
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

ifeq ($(COVERAGE),1)
.nyc-root: lib apps
	rm -rf $@ && mkdir -p $@ .nyc_output
	for directory in $^; do \
		./node_modules/.bin/nyc \
			instrument $(NYC_OPTS) $$directory $@/$$directory; \
	done
	cp package.json $@
else
.nyc-root:
	rm -rf $@ && mkdir -p $@ .nyc_output
endif

.tmp:
	mkdir -p $@

.tmp/haproxy.manifest.json: haproxy.manifest.tpl.json | .tmp
	node scripts/template $< > $@

docker-compose.yml: docker-compose.tpl.yml .tmp/haproxy.manifest.json | .tmp
	HAPROXY_CONFIG=$(shell cat $(word 2,$^) | base64 | tr -d '\n') \
		node scripts/template $< > $@

clean:
	rm -rf \
		*.0x \
		*.lock \
		dump.rdb \
		.nyc_output \
		coverage \
		postgres_data \
		webpack-bundle-report.html \
		webpack-bundle-report.chat-widget.html \
		rabbit_data \
		dist \
		.cache-loader

docs/assets/architecture.png: docs/diagrams/architecture.mmd
	./node_modules/.bin/mmdc -i $< -o $@ -w 2560 -H 1600

ARCHITECTURE.md: scripts/architecture-summary.sh \
	lib/*/DESCRIPTION.markdown apps/*/DESCRIPTION.markdown \
	docs/assets/architecture.png
	./$< > $@

dist:
	mkdir $@

postgres_data:
	initdb --pgdata $@

lint:
	./node_modules/.bin/eslint --ext .js,.jsx $(ESLINT_OPTION_FIX) \
		lib apps scripts test *.js
	./scripts/lint/check-filenames.sh
	./scripts/lint/check-descriptions.sh
	./scripts/lint/check-tests.sh
	./scripts/lint/check-licenses.sh
	./scripts/lint/check-apps.sh
	./scripts/lint/check-deployable-lib.sh
	shellcheck ./scripts/*.sh ./scripts/*/*.sh ./deploy-templates/*.sh
	./node_modules/.bin/deplint
	./node_modules/.bin/depcheck --ignore-bin-package --ignores='@babel/*,@jellyfish/*,scripts-template,assignment'

coverage:
	./node_modules/.bin/nyc $(NYC_GLOBAL_OPS) --reporter=text --reporter=html --reporter=json report

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	$(COVERAGE_COMMAND) node $(NODE_DEBUG_ARGS) \
		./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

test-unit:
	FILES="'./{test/unit,lib,apps}/**/*.spec.{js,jsx}'" SCRUB=0 make test

test-integration:
	FILES="'./test/integration/**/*.spec.js'" make test

test-e2e:
	FILES="'./test/e2e/**/*.spec.{js,jsx}'" SCRUB=0 make test

test-unit-%:
	FILES="'./test/unit/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test

# As a company policy, UI unit tests shall live alongside the
# production code. This policy only applies to *unit* tests,
# and integration/e2e UI tests will still live under `test`.
#
# These Make rules override the above conventions for this case.
test-unit-ui-components:
	FILES="'./lib/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test
test-unit-sdk:
	FILES="'./lib/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test
test-unit-chat-widget:
	FILES="'./lib/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test
test-unit-ui:
	FILES="'./apps/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test

test-integration-%:
	FILES="'./test/integration/$(subst test-integration-,,$@)/**/*.spec.js'" make test

test-e2e-%:
	FILES="'./test/e2e/$(subst test-e2e-,,$@)/**/*.spec.{js,jsx}'" make test

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)

node:
	node $(NODE_DEBUG_ARGS) $(FILE)

# -----------------------------------------------
# Entry Points
# -----------------------------------------------

start-server: LOGLEVEL = info
ifeq ($(COVERAGE),1)
start-server: .nyc-root
	exec $(NODE) $(NODE_ARGS) $^/apps/server/index.js
else
start-server:
	exec $(NODE) $(NODE_ARGS) apps/server/index.js
endif

start-worker: LOGLEVEL = info
ifeq ($(COVERAGE),1)
start-worker: .nyc-root
	exec $(NODE) $(NODE_ARGS) $^/apps/action-server/worker.js
else
start-worker:
	exec $(NODE) $(NODE_ARGS) apps/action-server/worker.js
endif

start-tick: LOGLEVEL = info
ifeq ($(COVERAGE),1)
start-tick: .nyc-root
	exec $(NODE) $(NODE_ARGS) $^/apps/action-server/tick.js
else
start-tick:
	exec $(NODE) $(NODE_ARGS) apps/action-server/tick.js
endif

start-rabbitmq:
	RABBITMQ_CONFIG_FILE=$(shell pwd)/rabbitmq.conf \
	RABBITMQ_MNESIA_BASE=$(shell pwd)/rabbit_data \
	rabbitmq-server

start-redis:
	exec redis-server --port $(REDIS_PORT)

# You might need to increase the maximum amount of semaphores
# system-wide in order to set the max connections parameters.
# In OpenBSD, set kern.seminfo.semmns=200 in /etc/sysctl.conf
# See https://www.postgresql.org/docs/11/kernel-resources.html
start-postgres: postgres_data
	exec postgres -N 100 -D $< -p $(POSTGRES_PORT)

start-static-%:
	cd dist/$(subst start-static-,,$@) && exec python2 -m SimpleHTTPServer $(UI_PORT)

# -----------------------------------------------
# Build
# -----------------------------------------------

ifeq ($(COVERAGE),1)
build-ui: .nyc-root
	NODE_ENV=test UI_DIRECTORY="./$</apps/ui" \
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/ui/webpack.config.js
else
build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/ui/webpack.config.js
endif

ifeq ($(COVERAGE),1)
build-livechat: .nyc-root
	NODE_ENV=test \
	LIVECHAT_DIR="./$</apps/livechat" \
	CHAT_WIDGET_DIR="./$</lib/chat-widget" \
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/livechat/webpack.config.js
else
build-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/livechat/webpack.config.js
endif

# -----------------------------------------------
# Development
# -----------------------------------------------

compose-exec-%: docker-compose.yml
	docker-compose $(DOCKER_COMPOSE_OPTIONS) \
		exec $(subst compose-exec-,,$@) $(COMMAND) $(ARGS) \
		$(DOCKER_COMPOSE_COMMAND_OPTIONS)

compose-up-%: docker-compose.yml
	docker-compose $(DOCKER_COMPOSE_OPTIONS) \
		up $(DOCKER_COMPOSE_COMMAND_OPTIONS) $(subst compose-up-,,$@) $(ARGS)

compose-logs-%: docker-compose.yml
	docker-compose $(DOCKER_COMPOSE_OPTIONS) \
		logs $(subst compose-logs-,,$@) $(DOCKER_COMPOSE_COMMAND_OPTIONS)

compose-%: docker-compose.yml
	docker-compose $(DOCKER_COMPOSE_OPTIONS) $(subst compose-,,$@) \
		$(DOCKER_COMPOSE_COMMAND_OPTIONS)

dev-%:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	NODE_ENV=development \
	./node_modules/.bin/webpack-dev-server \
		--config=./apps/$(subst dev-,,$@)/webpack.config.js \
		--color
