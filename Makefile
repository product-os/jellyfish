.PHONY: clean \
	lint \
	coverage \
	node \
	test \
	dev-ui \
	dev-chat-widget \
	dev-storybook \
	dev-create-user \
	build-ui \
	build-chat-widget \
	start-server \
	start-worker \
	start-tick \
	start-redis \
	start-static \
	start-postgres \
	test-unit \
	test-integration \
	test-e2e

# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# -----------------------------------------------
# Runtime Configuration
# -----------------------------------------------

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

PORT ?= 8000
export PORT
LOGLEVEL ?= debug
export LOGLEVEL
DB_HOST ?= localhost
export DB_HOST
DB_PORT ?= 28015
export DB_PORT
DB_USER ?=
export DB_USER
DB_PASSWORD ?=
export DB_PASSWORD
UI_PORT ?= 9000
export UI_PORT
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= $(PORT)
export SERVER_PORT
SERVER_DATABASE ?= jellyfish
export SERVER_DATABASE
DB_CERT ?=
export DB_CERT
DISABLE_CACHE ?=
export DISABLE_CACHE
DISABLE_REDIS ?=
export DISABLE_REDIS
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
LOCKFILE ?=
export LOCKFILE
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
									--stack_trace_on_illegal \
									--abort_on_stack_or_string_length_overflow

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
export CI
VISUAL ?=
export VISUAL
COVERAGE ?= 1
export COVERAGE

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

NYC_TMP_DIR = .tmp/nyc-lib
NYC_GLOBAL_OPS = --extension .js --extension .jsx
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
		dist \
		.cache-loader

ARCHITECTURE.markdown: scripts/architecture-summary.sh lib/*/DESCRIPTION.markdown apps/*/DESCRIPTION.markdown
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
	shellcheck ./scripts/*.sh ./scripts/*/*.sh ./.circleci/*.sh ./deploy-templates/*.sh
	./node_modules/.bin/deplint
	./node_modules/.bin/depcheck --ignore-bin-package --ignores='@storybook/*,@babel/*'

coverage:
	./node_modules/.bin/nyc $(NYC_GLOBAL_OPS) --reporter=text --reporter=html --reporter=json report

test: LOGLEVEL = warning
test:
	$(SCRUB_COMMAND)
	$(COVERAGE_COMMAND) node $(NODE_DEBUG_ARGS) \
		./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

test-unit:
	FILES="'./test/unit/**/*.spec.js'" SCRUB=0 make test

test-integration:
	FILES="'./test/integration/**/*.spec.js'" make test

test-e2e:
	FILES="'./test/e2e/**/*.spec.{js,jsx}'" \
		AVA_OPTS="--serial" make test

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
test-unit-ui:
	FILES="'./apps/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test
test-unit-chat-widget:
	FILES="'./apps/$(subst test-unit-,,$@)/**/*.spec.{js,jsx}'" SCRUB=0 make test

test-integration-%:
	FILES="'./test/integration/$(subst test-integration-,,$@)/**/*.spec.js'" make test

test-e2e-%:
	FILES="'./test/e2e/$(subst test-e2e-,,$@)/**/*.spec.{js,jsx}'" \
		AVA_OPTS="--serial" make test

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)

node:
	node $(NODE_DEBUG_ARGS) $(FILE)

# -----------------------------------------------
# Entry Points
# -----------------------------------------------

start-server: LOGLEVEL = info
start-server:
	$(NODE) $(NODE_ARGS) apps/server/index.js

start-worker: LOGLEVEL = info
start-worker:
	$(NODE) $(NODE_ARGS) apps/action-server/worker.js

start-tick: LOGLEVEL = info
start-tick:
	$(NODE) $(NODE_ARGS) apps/action-server/tick.js

start-redis:
	redis-server --port $(REDIS_PORT)

# You might need to increase the maximum amount of semaphores
# system-wide in order to set the max connections parameters.
# In OpenBSD, set kern.seminfo.semmns=200 in /etc/sysctl.conf
# See https://www.postgresql.org/docs/11/kernel-resources.html
start-postgres: postgres_data
	postgres -N 100 -D $< -p $(POSTGRES_PORT)

start-static:
	cd dist && python2 -m SimpleHTTPServer $(UI_PORT)

# -----------------------------------------------
# Build
# -----------------------------------------------

ifeq ($(COVERAGE),1)
build-ui:
	rm -rf $(NYC_TMP_DIR) && mkdir -p $(NYC_TMP_DIR)/{lib,apps}
	./node_modules/.bin/nyc instrument $(NYC_OPTS) lib/sdk $(NYC_TMP_DIR)/lib/sdk
	./node_modules/.bin/nyc instrument $(NYC_OPTS) lib/ui-components $(NYC_TMP_DIR)/lib/ui-components
	./node_modules/.bin/nyc instrument $(NYC_OPTS) lib/uuid $(NYC_TMP_DIR)/lib/uuid
	./node_modules/.bin/nyc instrument $(NYC_OPTS) apps/ui $(NYC_TMP_DIR)/apps/ui
	NODE_ENV=test UI_DIRECTORY="./$(NYC_TMP_DIR)/apps/ui" \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/ui/webpack.config.js
else
build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/ui/webpack.config.js
endif

ifeq ($(COVERAGE),1)
build-chat-widget:
	rm -rf $(NYC_TMP_DIR) && mkdir -p $(NYC_TMP_DIR)/{lib,apps}
	# TODO: The chat-widget should not require us to instrument the UI
	./node_modules/.bin/nyc instrument $(NYC_OPTS) apps/ui $(NYC_TMP_DIR)/apps/ui
	./node_modules/.bin/nyc instrument $(NYC_OPTS) lib/sdk $(NYC_TMP_DIR)/lib/sdk
	./node_modules/.bin/nyc instrument $(NYC_OPTS) lib/ui-components $(NYC_TMP_DIR)/lib/ui-components
	./node_modules/.bin/nyc instrument $(NYC_OPTS) apps/chat-widget $(NYC_TMP_DIR)/apps/chat-widget
	NODE_ENV=test UI_DIRECTORY="./$(NYC_TMP_DIR)/apps/chat-widget"\
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		JELLYFISH_TOKEN=$(JELLYFISH_TOKEN) \
		./node_modules/.bin/webpack --config=./apps/chat-widget/webpack.config.js
else
build-chat-widget:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
	JELLYFISH_TOKEN=$(JELLYFISH_TOKEN) \
		./node_modules/.bin/webpack --config=./apps/chat-widget/webpack.config.js
endif

# -----------------------------------------------
# Development
# -----------------------------------------------

# TODO: This should not be a rule, but something
# that start-server should do out of the box when
# running in development mode.
dev-create-user: LOGLEVEL = warning
dev-create-user:
	./scripts/dev/create-user.js

dev-ui: NODE_ENV = development
dev-ui:
	./node_modules/.bin/webpack-dev-server --config=./apps/ui/webpack.config.js --color

dev-chat-widget: NODE_ENV = development
dev-chat-widget:
	JELLYFISH_TOKEN=$(JELLYFISH_TOKEN) \
	./node_modules/.bin/webpack-dev-server --config=./apps/chat-widget/webpack.config.js --color

dev-storybook:
	./node_modules/.bin/start-storybook -p 6006
