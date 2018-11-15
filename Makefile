.PHONY: lint \
	build-ui \
	dev-ui \
	test \
	build \
	start-server \
	start-dev-server \
	start-db \
	test-e2e \
	test-unit \
	test-integration

API_URL ?= http://localhost:8000/
DB_HOST := $(or ${JF_RETHINKDB_SERVICE_HOST},${DB_HOST},localhost)
DB_PORT := $(or ${JF_RETHINKDB_SERVICE_PORT_DATA_PORT},${DB_PORT},28015)
NODE_DEBUG ?= 'jellyfish:*'
COVERAGE ?= 1
AVA_OPTS ?=
DISABLE_CACHE ?=

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
	DISABLE_CACHE=$(DISABLE_CACHE) \
	PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
	$(COVERAGE_COMMAND) ./node_modules/.bin/ava $(AVA_OPTS) $(FILES)

test-unit:
	FILES=./test/unit/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration:
	FILES=./test/integration/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
		API_URL=$(API_URL) \
		AVA_OPTS="--serial" \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-unit-%:
	FILES=./test/unit/$(subst test-unit-,,$@)/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-integration-%:
	FILES=./test/integration/$(subst test-integration-,,$@)/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		PUPPETEER_VISUAL_MODE=$(PUPPETEER_VISUAL_MODE) \
		API_URL=$(API_URL) \
		AVA_OPTS="--serial" \
		DISABLE_CACHE=$(DISABLE_CACHE) \
		COVERAGE=$(COVERAGE) \
		make test

test-e2e:
	@NODE_ENV=test \
		JF_TEST_USER=$(JF_TEST_USER) \
		JF_TEST_PASSWORD=$(JF_TEST_PASSWORD) \
		JF_URL=$(API_URL) \
		./node_modules/.bin/ava test/e2e/**/*.spec.js

build: build-ui

ifeq ($(NODE_ENV),production)
NODE_EXEC="node"
else
NODE_EXEC="./node_modules/.bin/supervisor"
endif

start-server:
	DEBUG=$(NODE_DEBUG) \
	DB_HOST=$(DB_HOST) \
	DB_PORT=$(DB_PORT) \
	INTEGRATION_GITHUB_TOKEN=$(INTEGRATION_GITHUB_TOKEN) \
	INTEGRATION_FRONT_TOKEN=$(INTEGRATION_FRONT_TOKEN) \
	$(NODE_EXEC) lib/server/index.js

start-dev-server:
	NODE_ENV=debug \
	docker-compose -f docker-compose.dev.yml -f docker-compose.local.yml up

start-db:
	rethinkdb --driver-port $(DB_PORT)

ngrok-%:
	ngrok start -config ./ngrok.yml $(subst ngrok-,,$@)
