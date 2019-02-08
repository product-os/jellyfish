.PHONY: clean \
	lint \
	dev-ui \
	dev-storybook \
	coverage \
	test \
	build \
	compose \
	start-server \
	start-worker \
	start-tick \
	start-redis \
	start-postgres \
	start-db \
	test-unit \
	test-integration \
	test-e2e

# -----------------------------------------------
# Runtime Configuration
# -----------------------------------------------

DATABASE ?= rethinkdb
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

FS_DRIVER ?= localFS
export FS_DRIVER
AWS_ACCESS_KEY_ID ?=
export AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY ?=
export AWS_SECRET_ACCESS_KEY

ifeq ($(NODE_ENV),production)
RETHINKDB_MIN_POOL_SIZE ?= 50
RETHINKDB_MAX_POOL_SIZE ?= 1000
else
RETHINKDB_MIN_POOL_SIZE ?= 4
RETHINKDB_MAX_POOL_SIZE ?= 20
endif
export RETHINKDB_MIN_POOL_SIZE
export RETHINKDB_MAX_POOL_SIZE

INTEGRATION_FRONT_TOKEN ?=
export INTEGRATION_FRONT_TOKEN
INTEGRATION_GITHUB_TOKEN ?=
export INTEGRATION_GITHUB_TOKEN
INTEGRATION_GITHUB_SIGNATURE_KEY ?=
export INTEGRATION_GITHUB_SIGNATURE_KEY

# -----------------------------------------------
# Test Runtime Configuration
# -----------------------------------------------

TEST_INTEGRATION_GITHUB_REPO ?= balena-io/jellyfish-test-github
export TEST_INTEGRATION_GITHUB_REPO
TEST_INTEGRATION_FRONT_INBOX ?= inb_8t8y
export TEST_INTEGRATION_FRONT_INBOX

# -----------------------------------------------
# Build Configuration
# -----------------------------------------------

# To make sure we don't silently swallow errors
NODE_ARGS = --abort-on-uncaught-exception
NODE_DEBUG_ARGS = $(NODE_ARGS) \
									--trace-warnings \
									--stack_trace_on_illegal \
									--abort_on_stack_or_string_length_overflow

ifeq ($(NODE_ENV),production)
NODE_EXEC="node"
else
NODE_EXEC="./node_modules/.bin/supervisor"
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
SCRUB_COMMAND = ./scripts/scrub-test-databases.js; ./scripts/postgres-delete-test-databases.js
else
SCRUB_COMMAND =
endif

SENTRY_DSN_UI ?=

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
TSLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
TSLINT_OPTION_FIX = --fix
endif

ifeq ($(COVERAGE),1)
COVERAGE_COMMAND = ./node_modules/.bin/nyc --no-clean
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
		rethinkdb_data \
		dump.rdb \
		.nyc_output \
		coverage \
		postgres_data \
		webpack-bundle-report.html \
		jellyfish-files \
		dist \
		.cache-loader

dist:
	mkdir $@

dist/docs.html: apps/server/api.yaml | dist
	redoc-cli bundle -o $@ $<

postgres_data:
	initdb --pgdata $@

docker-compose.local.yml:
	echo "version: \"3\"" > $@
	echo "# Use this file to make local docker-compose changes" >> $@

build:
	SENTRY_DSN_UI=$(SENTRY_DSN_UI) ./node_modules/.bin/webpack

lint:
	./node_modules/.bin/eslint $(ESLINT_OPTION_FIX) \
		lib apps scripts test stress webpack.config.js
	./node_modules/.bin/tslint $(TSLINT_OPTION_FIX) --format stylish \
		"lib/**/*.ts" "lib/**/*.tsx" "apps/**/*.ts" "apps/**/*.tsx" \
		--exclude "lib/*/node_modules/**" \
		--exclude "lib/*/dist/**"
	./scripts/check-filenames.sh
	shellcheck ./scripts/*.sh ./scripts/ci/*.sh ./.circleci/*.sh ./deploy-templates/*.sh
	./node_modules/.bin/deplint

coverage:
	./node_modules/.bin/nyc --reporter=text --reporter=lcov --reporter=json report

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
	FILES="'./test/e2e/**/*.spec.js'" \
		AVA_OPTS="--serial" make test

test-unit-%:
	FILES="'./test/unit/$(subst test-unit-,,$@)/**/*.spec.js'" SCRUB=0 make test

test-integration-%:
	FILES="'./test/integration/$(subst test-integration-,,$@)/**/*.spec.js'" make test

test-e2e-%:
	FILES="'./test/e2e/$(subst test-e2e-,,$@)/**/*.spec.js'" \
		AVA_OPTS="--serial" make test

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)

compose: LOGLEVEL = info
compose: docker-compose.local.yml
	docker-compose -f docker-compose.dev.yml -f $< up

# -----------------------------------------------
# Entry Points
# -----------------------------------------------

start-server: LOGLEVEL = info
start-server:
	$(NODE_EXEC) $(NODE_ARGS) apps/server/index.js

start-worker: LOGLEVEL = info
start-worker:
	$(NODE_EXEC) $(NODE_ARGS) apps/action-server/worker.js

start-tick: LOGLEVEL = info
start-tick:
	$(NODE_EXEC) $(NODE_ARGS) apps/action-server/tick.js

start-redis:
	redis-server --port $(REDIS_PORT)

start-db:
	rethinkdb --driver-port $(DB_PORT)

start-postgres: postgres_data
	postgres -N 1000 -D $< -p $(POSTGRES_PORT)

# -----------------------------------------------
# Development
# -----------------------------------------------

dev-ui:
	./node_modules/.bin/webpack-dev-server --color

dev-storybook:
	./node_modules/.bin/start-storybook -p 6006
