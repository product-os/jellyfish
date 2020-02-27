#!/bin/bash

source "$(dirname $0)/helpers.sh"
START=$(date)
cd $WORKDIR

curl http://monarci.com:3000/\?test\=parallel-3\&state\=start

# Install dependencies
echo "=== Install dependencies"
cd scripts/template && npm install && cd $WORKDIR

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
