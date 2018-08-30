.PHONY: lint build-ui dev-ui test build start-server start-db

PROFILE ?= 0
API_URL ?= http://localhost:8000/
DB_HOST ?= localhost
DB_PORT ?= 28015
NODE_DEBUG ?= 'jellyfish:*'

ifeq ($(FIX),)
ESLINT_OPTION_FIX =
TSLINT_OPTION_FIX =
else
ESLINT_OPTION_FIX = --fix
TSLINT_OPTION_FIX = --fix
endif

lint:
	./node_modules/.bin/eslint $(ESLINT_OPTION_FIX) \
		lib test stress webpack.config.js
	./node_modules/.bin/tslint $(TSLINT_OPTION_FIX) --format stylish \
		lib/**/*.ts lib/**/*.tsx \
		--exclude lib/*/node_modules/** \
		--exclude lib/*/dist/**/*.js

build-ui:
	NODE_ENV=production ./node_modules/.bin/webpack

dev-ui:
	NODE_ENV=dev API_URL=$(API_URL) ./node_modules/.bin/webpack-dev-server --color

test:
	node scripts/scrub-test-databases.js
	NODE_ENV=test DB_HOST=$(DB_HOST) DB_PORT=$(DB_PORT) API_URL=$(API_URL) \
		./node_modules/.bin/nyc \
			--reporter=lcov \
			./node_modules/.bin/ava $(FILES)

test-%:
	FILES=./test/$(subst test-,,$@)/**/*.spec.js \
		DB_HOST=$(DB_HOST) \
		DB_PORT=$(DB_PORT) \
		API_URL=$(API_URL) \
		make test

build: build-ui
	rm -rf ./lib/action-library/dist && \
		./node_modules/.bin/tsc --project ./lib/action-library

start-server:
ifeq ($(PROFILE),1)
	DEBUG=$(NODE_DEBUG) node scripts/profiler.js lib/server/index.js
else
	DEBUG=$(NODE_DEBUG) node lib/server/index.js
endif

start-db:
	rethinkdb --driver-port $(DB_PORT)
