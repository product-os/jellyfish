.PHONY: clean \
	lint \
	node \
	test \
	build-ui \
	build-livechat \
	start-server \
	start-worker \
	start-tick \
	start-redis \
	start-postgres \
	test-unit \
	test-integration \
	test-e2e \
	scrub \
	clean-front \
	clean-github

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
MAILGUN_DOMAIN ?= mail.ly.fish
export MAILGUN_DOMAIN
MAILGUN_BASE_URL = https://api.mailgun.net/v3
export MAILGUN_BASE_URL

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
INTEGRATION_GITHUB_APP_ID ?=
export INTEGRATION_GITHUB_APP_ID

# The base64 encoded PEM key
INTEGRATION_GITHUB_PRIVATE_KEY ?=
export INTEGRATION_GITHUB_PRIVATE_KEY

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

# Google APIs (Google Meet)
INTEGRATION_GOOGLE_MEET_CREDENTIALS ?= "{}"
export INTEGRATION_GOOGLE_MEET_CREDENTIALS

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

# Typeform
INTEGRATION_TYPEFORM_SIGNATURE_KEY ?=
export INTEGRATION_TYPEFORM_SIGNATURE_KEY

# Service Worker
JF_WEB_PUSH ?=
export JF_WEB_PUSH
VAPID_PUBLIC_KEY ?=
export VAPID_PUBLIC_KEY

# -----------------------------------------------
# Test Runtime Configuration
# -----------------------------------------------

TEST_INTEGRATION_GITHUB_REPO ?= product-os/jellyfish-test-github
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

# Assumes nsolid-console is running on the background
ifeq ($(NODE_ENV),nsolid)
NODE = "nsolid"
NSOLID_COMMAND ?= localhost:9001
export NSOLID_COMMAND

else
NODE = "node"
endif
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

DOCKER_COMPOSE_FILES = --file docker-compose.yml
ifdef MONITOR
DOCKER_COMPOSE_FILES += --file docker-compose.monitor.yml
endif
ifdef SIDECAR
DOCKER_COMPOSE_FILES += --file docker-compose.sidecar.yml
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
		postgres_data \
		webpack-bundle-report.html \
		webpack-bundle-report.chat-widget.html \
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
	initdb --locale=en_US.UTF8 --pgdata $@

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
	./node_modules/.bin/depcheck --ignore-bin-package --ignores='@babel/*,@jellyfish/*,scripts-template,assignment,@ava/babel,canvas,history'

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

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

clean-front:
	FRONT_INBOX_1=$(TEST_INTEGRATION_FRONT_INBOX_1) \
	FRONT_INBOX_2=$(TEST_INTEGRATION_FRONT_INBOX_2) \
	node ./scripts/ci/front-delete-conversations.js

clean-github:
	GITHUB_REPO=$(TEST_INTEGRATION_GITHUB_REPO) \
	node ./scripts/ci/github-close-issues.js

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)

node:
	node $(NODE_DEBUG_ARGS) $(FILE)

# -----------------------------------------------
# Entry Points
# -----------------------------------------------

start-server: LOGLEVEL = info
start-server:
	NSOLID_APP=server exec $(NODE) $(NODE_ARGS) apps/server/index.js

start-worker: LOGLEVEL = info
start-worker:
	NSOLID_APP=worker exec $(NODE) $(NODE_ARGS) apps/action-server/worker.js

start-tick: LOGLEVEL = info
start-tick:
	NSOLID_APP=tick exec $(NODE) $(NODE_ARGS) apps/action-server/tick.js

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

build-ui:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/ui/webpack.config.js

build-livechat:
	API_URL=$(SERVER_HOST):$(SERVER_PORT) \
		./node_modules/.bin/webpack --config=./apps/livechat/webpack.config.js

# -----------------------------------------------
# Development
# -----------------------------------------------

docker-exec-%:
	docker exec $(subst docker-exec-,,$@) $(COMMAND) $(ARGS)

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
