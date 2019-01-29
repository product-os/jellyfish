.PHONY: lint \
	build-ui \
	dev-ui \
	storybook-dev \
	report-coverage \
	test \
	build \
	start-server \
	start-worker \
	start-dev-server \
	start-db \
	test-e2e \
	test-unit \
	test-integration

# To make sure we don't silently swallow errors
NODE_ARGS = --abort-on-uncaught-exception

NODE_DEBUG_ARGS = $(NODE_ARGS) \
									--trace-warnings \
									--stack_trace_on_illegal \
									--abort_on_stack_or_string_length_overflow

ACTION_SERVER_TYPE ?= worker
API_URL ?= http://localhost:8000/
DB_HOST ?= localhost
DB_PORT ?= 28015
NODE_DEBUG ?= 'jellyfish:*'
NODE_ENV ?= test
COVERAGE ?= 1
DISABLE_CACHE ?=
LOGENTRIES_TOKEN ?=
SENTRY_DSN_SERVER ?=
SENTRY_DSN_UI ?=

ifeq ($(NODE_ENV),production)
RETHINKDB_MIN_POOL_SIZE ?= 50
RETHINKDB_MAX_POOL_SIZE ?= 1000
NODE_EXEC="node"
else
NODE_EXEC="./node_modules/.bin/supervisor"
RETHINKDB_MIN_POOL_SIZE ?= 4
RETHINKDB_MAX_POOL_SIZE ?= 20
endif

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

INTEGRATION_FRONT_TOKEN ?=
INTEGRATION_GITHUB_TOKEN ?=
INTEGRATION_GITHUB_SIGNATURE_KEY ?=

# Test configuration
INTEGRATION_GITHUB_TEST_REPO ?= "balena-io/jellyfish-test-github"
INTEGRATION_FRONT_TEST_INBOX ?= "inb_8t8y"

dist:
	mkdir $@

dist/docs.html: lib/server/api.yaml | dist
	redoc-cli bundle -o $@ $<

lint:
	./node_modules/.bin/eslint $(ESLINT_OPTION_FIX) \
		lib scripts test stress webpack.config.js
	./node_modules/.bin/tslint $(TSLINT_OPTION_FIX) --format stylish \
		"lib/**/*.ts" "lib/**/*.tsx" \
		--exclude "lib/*/node_modules/**" \
		--exclude "lib/*/dist/**"
	./scripts/check-filenames.sh
	shellcheck ./scripts/*.sh ./scripts/ci/*.sh ./.circleci/*.sh ./deploy-templates/*.sh

build-ui:
	NODE_ENV=$(NODE_ENV) SENTRY_DSN_UI=$(SENTRY_DSN_UI) ./node_modules/.bin/webpack

dev-ui:
	NODE_ENV=dev API_URL=$(API_URL) ./node_modules/.bin/webpack-dev-server --color

storybook-dev:
	./node_modules/.bin/start-storybook -p 6006

report-coverage:
	./node_modules/.bin/nyc --reporter=text --reporter=lcov --reporter=json report

test: LOGLEVEL = warning
test:
	node scripts/scrub-test-databases.js
	NODE_ENV=$(NODE_ENV) \
	DB_HOST=$(DB_HOST) \
	DB_PORT=$(DB_PORT) \
	API_URL=$(API_URL) \
	LOGLEVEL=$(LOGLEVEL) \
	INTEGRATION_GITHUB_TEST_REPO=$(INTEGRATION_GITHUB_TEST_REPO) \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$(INTEGRATION_GITHUB_SIGNATURE_KEY) \
	INTEGRATION_FRONT_TEST_INBOX=$(INTEGRATION_FRONT_TEST_INBOX) \
	RETHINKDB_MIN_POOL_SIZE=$(RETHINKDB_MIN_POOL_SIZE) \
	RETHINKDB_MAX_POOL_SIZE=$(RETHINKDB_MAX_POOL_SIZE) \
	DISABLE_CACHE=$(DISABLE_CACHE) \
	PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
	$(COVERAGE_COMMAND) node $(NODE_DEBUG_ARGS) ./node_modules/.bin/ava $(AVA_ARGS) $(FILES)

test-unit:
	FILES="'./test/unit/**/*.spec.js'" \
		NODE_ENV=$(NODE_ENV) \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		LOGLEVEL=$(LOGLEVEL) \
		CI=$(CI) \
		INTEGRATION_GITHUB_TEST_REPO=$(INTEGRATION_GITHUB_TEST_REPO) \
		INTEGRATION_FRONT_TEST_INBOX=$(INTEGRATION_FRONT_TEST_INBOX) \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration:
	FILES="'./test/integration/**/*.spec.js'" \
		NODE_ENV=$(NODE_ENV) \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
		API_URL=$(API_URL) \
		LOGLEVEL=$(LOGLEVEL) \
		CI=$(CI) \
		INTEGRATION_GITHUB_TEST_REPO=$(INTEGRATION_GITHUB_TEST_REPO) \
		INTEGRATION_FRONT_TEST_INBOX=$(INTEGRATION_FRONT_TEST_INBOX) \
		RETHINKDB_MIN_POOL_SIZE=$(RETHINKDB_MIN_POOL_SIZE) \
		RETHINKDB_MAX_POOL_SIZE=$(RETHINKDB_MAX_POOL_SIZE) \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-unit-%:
	FILES="'./test/unit/$(subst test-unit-,,$@)/**/*.spec.js'" \
		NODE_ENV=$(NODE_ENV) \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		LOGLEVEL=$(LOGLEVEL) \
		CI=$(CI) \
		INTEGRATION_GITHUB_TEST_REPO=$(INTEGRATION_GITHUB_TEST_REPO) \
		INTEGRATION_FRONT_TEST_INBOX=$(INTEGRATION_FRONT_TEST_INBOX) \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration-%:
	FILES="'./test/integration/$(subst test-integration-,,$@)/**/*.spec.js'" \
		NODE_ENV=$(NODE_ENV) \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
		API_URL=$(API_URL) \
		LOGLEVEL=$(LOGLEVEL) \
		CI=$(CI) \
		INTEGRATION_GITHUB_TEST_REPO=$(INTEGRATION_GITHUB_TEST_REPO) \
		INTEGRATION_FRONT_TEST_INBOX=$(INTEGRATION_FRONT_TEST_INBOX) \
		AVA_OPTS="--serial" \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-e2e:
	@NODE_ENV=$(NODE_ENV) \
		JF_TEST_USER=$(JF_TEST_USER) \
		JF_TEST_PASSWORD=$(JF_TEST_PASSWORD) \
		JF_URL=$(API_URL) \
		./node_modules/.bin/ava test/e2e/**/*.spec.js

build: build-ui

start-server: LOGLEVEL = info
start-server:
	DEBUG=$(NODE_DEBUG) \
	DB_HOST=$(DB_HOST) \
	DB_PORT=$(DB_PORT) \
	LOGLEVEL=$(LOGLEVEL) \
	LOGENTRIES_TOKEN=$(LOGENTRIES_TOKEN) \
	SENTRY_DSN_SERVER=$(SENTRY_DSN_SERVER) \
	INTEGRATION_GITHUB_TOKEN=$(INTEGRATION_GITHUB_TOKEN) \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$(INTEGRATION_GITHUB_SIGNATURE_KEY) \
	INTEGRATION_FRONT_TOKEN=$(INTEGRATION_FRONT_TOKEN) \
	RETHINKDB_MIN_POOL_SIZE=$(RETHINKDB_MIN_POOL_SIZE) \
	RETHINKDB_MAX_POOL_SIZE=$(RETHINKDB_MAX_POOL_SIZE) \
	$(NODE_EXEC) $(NODE_ARGS) lib/server/index.js

start-worker: LOGLEVEL = info
start-worker:
	ACTION_SERVER_TYPE=$(ACTION_SERVER_TYPE) \
	DEBUG=$(NODE_DEBUG) \
	DB_HOST=$(DB_HOST) \
	DB_PORT=$(DB_PORT) \
	LOGLEVEL=$(LOGLEVEL) \
	LOGENTRIES_TOKEN=$(LOGENTRIES_TOKEN) \
	SENTRY_DSN_SERVER=$(SENTRY_DSN_SERVER) \
	RETHINKDB_MIN_POOL_SIZE=$(RETHINKDB_MIN_POOL_SIZE) \
	RETHINKDB_MAX_POOL_SIZE=$(RETHINKDB_MAX_POOL_SIZE) \
	$(NODE_EXEC) $(NODE_ARGS) lib/action-server/index.js

docker-compose.local.yml:
	echo "version: \"3\"\n# Use this file to make local changes for the docker-compose setup" > docker-compose.local.yml

start-dev-server: LOGLEVEL = info
start-dev-server:
	NODE_ENV=debug \
	docker-compose -f docker-compose.dev.yml -f docker-compose.local.yml up

start-db:
	rethinkdb --driver-port $(DB_PORT)

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)
