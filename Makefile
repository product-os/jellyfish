.PHONY: lint \
	build-ui \
	dev-ui \
	test \
	build \
	start-server \
	start-db \
	test-e2e \
	test-unit \
	test-integration

API_URL ?= http://localhost:8000/
DB_HOST ?= localhost
DB_PORT ?= 28015
NODE_DEBUG ?= 'jellyfish:*'
COVERAGE ?= 1

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
TSLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
TSLINT_OPTION_FIX = --fix
endif

ifeq ($(COVERAGE),1)
COVERAGE_COMMAND = ./node_modules/.bin/nyc --reporter=lcov
else
COVERAGE_COMMAND =
endif

lint:
	./node_modules/.bin/eslint $(ESLINT_OPTION_FIX) \
		lib test stress webpack.config.js
	./node_modules/.bin/tslint $(TSLINT_OPTION_FIX) --format stylish \
		"lib/**/*.ts" "lib/**/*.tsx" \
		--exclude "lib/*/node_modules/**" \
		--exclude "lib/*/dist/**"

build-ui:
	NODE_ENV=production ./node_modules/.bin/webpack

dev-ui:
	NODE_ENV=dev API_URL=$(API_URL) ./node_modules/.bin/webpack-dev-server --color

test:
	node scripts/scrub-test-databases.js
	NODE_ENV=test \
	DB_HOST=$(DB_HOST) \
	DB_PORT=$(DB_PORT) \
	API_URL=$(API_URL) \
	$(COVERAGE_COMMAND) ./node_modules/.bin/ava $(FILES)

test-unit:
	FILES=./test/unit/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration:
	FILES=./test/integration/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		COVERAGE=$(COVERAGE) \
		make test

test-unit-%:
	FILES=./test/unit/$(subst test-unit-,,$@)/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration-%:
	FILES=./test/integration/$(subst test-integration-,,$@)/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		COVERAGE=$(COVERAGE) \
		make test

test-e2e:
	@NODE_ENV=test \
		JF_TEST_USER=$(JF_TEST_USER) \
		JF_TEST_PASSWORD=$(JF_TEST_PASSWORD) \
		JF_URL=$(API_URL) \
		./node_modules/.bin/ava test/e2e/**/*.spec.js

build: build-ui
	rm -rf ./lib/action-library/dist && \
		./node_modules/.bin/tsc --project ./lib/action-library

start-server:
	DEBUG=$(NODE_DEBUG) node lib/server/index.js

start-db:
	rethinkdb --driver-port $(DB_PORT)
