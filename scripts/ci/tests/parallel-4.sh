#!/bin/bash

source "$(dirname $0)/helpers.sh"
START=$(date)
cd $WORKDIR

# Start local services
echo "=== Start Local Services"
start_postgres
start_redis

cd $WORKDIR
echo "=== Unit Tests"
make test-unit COVERAGE=1

echo "=== Sync Tests Outreach Translate Without Tokens"
make test \
	FILES=./test/integration/sync/outreach-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_OUTREACH_APP_ID= \
	INTEGRATION_OUTREACH_APP_SECRET= \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=


echo "=== Sync Tests Outreach Mirror Without Tokens"
make test \
	FILES=./test/integration/server/outreach-mirror.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_OUTREACH_APP_ID= \
	INTEGRATION_OUTREACH_APP_SECRET= \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=


echo "=== Sync Tests Balena API Translate Without Tokens"
make test \
	FILES=./test/integration/sync/balena-api-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION= \
	INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING= \
	INTEGRATION_BALENA_API_PRIVATE_KEY=

echo "=== Sync Tests GitHub Translate"
make test \
	FILES=./test/integration/sync/github-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_GITHUB_TOKEN=$INTEGRATION_GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$INTEGRATION_GITHUB_SIGNATURE_KEY

echo "=== Sync Tests GitHub Translate Without Tokens"
make test \
	FILES=./test/integration/sync/github-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_GITHUB_TOKEN=

echo "=== Sync Tests Flowdock Translate"
make test \
	FILES=./test/integration/sync/flowdock-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY=$INTEGRATION_FLOWDOCK_SIGNATURE_KEY \
	INTEGRATION_FLOWDOCK_TOKEN=$INTEGRATION_FLOWDOCK_TOKEN

echo "=== Sync Tests Flowdock Translate Without Tokens"
make test \
	FILES=./test/integration/sync/flowdock-translate.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY= \
	INTEGRATION_FLOWDOCK_TOKEN=

# Run tests
echo "=== eslint"
cd ./scripts/eslint-plugin-jellyfish && npm install && npm test

cd $WORKDIR
# Install dependencies
echo "=== Install Dependencies"
cd scripts/template && npm install && cd $WORKDIR

echo "=== Sync End To End Tests Without Tokens "
make test \
	FILES=./test/e2e/sync/front-mirror.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_FRONT_TOKEN= \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

# Run tests
echo "=== End To End Tests (Livechat)"
make test-e2e-livechat \
	COVERAGE=1 \
	SCRUB=0 \
	LIVECHAT_HOST=http://livechat \
	LIVECHAT_PORT=80 \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

echo "=== Postgres Dump"
$WORKDIR/scripts/postgres-dump.sh /root/dump-livechat.gz


echo "=== Sync End To End Tests Without Tokens"
make test \
	FILES=./test/e2e/sync/github-mirror.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_GITHUB_TOKEN= \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

END=$(date)
echo "START: $START"
echo "END:   $END"

stop_postgres
stop_redis

sleep infinity & wait
