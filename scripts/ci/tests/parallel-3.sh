#!/bin/bash

source "$(dirname $0)/helpers.sh"
START=$(date)
cd $WORKDIR

curl http://monarci.com:3000/\?test\=parallel-3\&state\=start

# Start local services
echo "=== Start Local Services"
start_postgres
start_redis

# Run tests
echo "=== Integration Tests"
make test-integration-core test-integration-queue test-integration-sync test-integration-worker COVERAGE=1 SCRUB=0 && \
	make test-integration-server \
		COVERAGE=1 \
		SCRUB=0 \
		INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
		INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
		INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
		OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish \
		SERVER_HOST=http://localhost \
		SERVER_PORT=8000 \
		POSTGRES_HOST=$LOCAL_POSTGRES_HOST \
		POSTGRES_USER=$LOCAL_POSTGRES_USER \
		POSTGRES_PASSWORD=$LOCAL_POSTGRES_PASSWORD \
		POSTGRES_DATABASE=$LOCAL_POSTGRES_DATABASE \
		REDIS_HOST=localhost

stop_postgres
stop_redis

# Install dependencies
echo "=== Install dependencies"
cd scripts/template && npm install && cd $WORKDIR

# Run tests
echo "=== Sync Tests"
make test \
	FILES=./test/e2e/sync/discourse-mirror.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_DISCOURSE_TOKEN=$DISCOURSE_TOKEN \
	INTEGRATION_DISCOURSE_SIGNATURE_KEY=$DISCOURSE_SIGNATURE_KEY \
	INTEGRATION_DISCOURSE_USERNAME=$DISCOURSE_USERNAME \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

echo "=== Sync End To End Tests Without Tokens"
make test \
	FILES=./test/e2e/sync/discourse-mirror.spec.js \
	SCRUB=0 \
	COVERAGE=1 \
	INTEGRATION_DISCOURSE_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

# Run tests
echo "=== End To End Tests (UI)"
make test-e2e-ui \
	COVERAGE=1 \
	SCRUB=0 \
	UI_HOST=http://ui \
	UI_PORT=80 \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

echo "=== Postgres Dump"
$WORKDIR/scripts/postgres-dump.sh /root/dump-ui.gz

END=$(date)
echo "START: $START"
echo "END:   $END"

curl http://monarci.com:3000/\?test\=parallel-3\&state\=stop

sleep infinity & wait
