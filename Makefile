.PHONY: clean \
	lint \
	node \
	test \
	docs \
	build-ui \
	build-livechat \
	start-server \
	start-worker \
	start-redis \
	start-postgres \
	test-unit \
	test-integration-server \
	test-integration \
	test-e2e \
	scrub \
	npm-install \
	push \
	ssh \
	npm-ci \
	exec-apps

# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
MAKEFILE_DIR := $(patsubst %/,%,$(dir $(MAKEFILE_PATH)))

# -----------------------------------------------
# Runtime Configuration
# -----------------------------------------------

# Project name
NAME ?= jellyfish

# silence graphile-worker logs
NO_LOG_SUCCESS = 1
export NO_LOG_SUCCESS

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
DETACH ?=
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
ifdef MATCH
AVA_ARGS += --match $(MATCH)
endif

# -----------------------------------------------
# Rules
# -----------------------------------------------

npm-install:
	npm install && CMD="npm install" make exec-apps

npm-ci:
	npm ci && CMD="npm ci" make exec-apps

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
	apps/*/DESCRIPTION.markdown \
	docs/assets/architecture.png
	./$< > $@

dist:
	mkdir $@

postgres_data:
	initdb --locale=en_US.UTF8 --pgdata $@

lint:
	./node_modules/.bin/eslint --ext .js,.jsx $(ESLINT_OPTION_FIX) scripts test
	./scripts/lint/check-filenames.sh
	./scripts/lint/check-descriptions.sh
	./scripts/lint/check-tests.sh
	./scripts/lint/check-licenses.sh
	./scripts/lint/check-apps.sh
	npx shellcheck ./scripts/*.sh ./scripts/*/*.sh ./deploy-templates/*.sh
	./node_modules/.bin/deplint
	./node_modules/.bin/depcheck --ignore-bin-package --ignores='@babel/*,assignment,@ava/babel,canvas,history,@balena/ci-task-runner,@balena/jellyfish-sync,@balena/jellyfish-plugin-base,@balena/jellyfish-action-library,@balena/jellyfish-plugin-default,@balena/jellyfish-plugin-product-os,@balena/jellyfish-plugin-channels,@balena/jellyfish-plugin-typeform,@balena/jellyfish-plugin-github,@balena/jellyfish-plugin-flowdock,@balena/jellyfish-plugin-discourse,@balena/jellyfish-plugin-outreach,@balena/jellyfish-plugin-front,@balena/jellyfish-plugin-balena-api,@balena/jellyfish-worker,@balena/jellyfish-queue,@balena/jellyfish-config,webpack,shellcheck'
	cd apps/server && make lint FIX=$(FIX)
	cd apps/action-server && make lint
	cd apps/livechat && make lint FIX=$(FIX)
	cd apps/ui && make lint FIX=$(FIX)

scrub:
	$(SCRUB_COMMAND)

test: LOGLEVEL = warning
test: scrub
	node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

test-unit:
	cd apps/ui && make test
	cd apps/server && make test-unit

test-integration:
	FILES="'./test/integration/**/*.spec.js'" make test

test-e2e:
	FILES="'./test/e2e/**/*.spec.{js,jsx}'" SCRUB=0 make test

# As a company policy, UI unit tests shall live alongside the
# production code. This policy only applies to *unit* tests,
# and integration/e2e UI tests will still live under `test`.
#
# These Make rules override the above conventions for this case.
test-unit-ui:
	cd apps/ui && make test

test-integration-server:
	cd apps/server && make test-integration

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
start-server:
	cd apps/server && make start-server

start-worker:
	cd apps/action-server && make start-worker

start-redis:
	exec redis-server

# You might need to increase the maximum amount of semaphores
# system-wide in order to set the max connections parameters.
# In OpenBSD, set kern.seminfo.semmns=200 in /etc/sysctl.conf
# See https://www.postgresql.org/docs/11/kernel-resources.html
start-postgres: postgres_data
	exec postgres -N 100 -D $<

# -----------------------------------------------
# Build
# -----------------------------------------------

build-ui:
	cd apps/ui && \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) make build-ui

build-livechat:
	cd apps/livechat && \
		SENTRY_DSN_UI=$(SENTRY_DSN_UI) make build-livechat

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
	cd apps/$(subst dev-,,$@) && make dev-$(subst dev-,,$@)

push:
	CMD="rm -f ./packages/*" make exec-apps
	balena push jel.ly.fish.local $(NOCACHE_FLAG)

ssh:
	balena ssh jel.ly.fish.local

deploy-%:
	./scripts/deploy-package.js jellyfish-$(subst deploy-,,$@)

# Execute a command under each app directory
exec-apps:
	for app in $(shell find $(MAKEFILE_DIR)/apps -maxdepth 1 -mindepth 1 -type d | sort -g); do cd $$app && echo - $$app: && $(CMD); done

# TODO: make use of exec-apps once all apps are converted to TypeScript
docs:
	cd apps/ui && npm run doc
