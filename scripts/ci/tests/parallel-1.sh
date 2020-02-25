#!/bin/bash

source "$(dirname $0)/helpers.sh"
START=$(date)
cd $WORKDIR

curl http://monarci.com:3000/\?test\=parallel-1\&state\=start

# Run tests
echo "=== Sync Tests"
make test \
	FILES=./test/integration/sync/discourse-translate.spec.js \
	COVERAGE=1 \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN=$INTEGRATION_DISCOURSE_TOKEN \
	INTEGRATION_DISCOURSE_SIGNATURE_KEY=$INTEGRATION_DISCOURSE_SIGNATURE_KEY \
	INTEGRATION_DISCOURSE_USERNAME=$INTEGRATION_DISCOURSE_USERNAME \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

echo "=== Sync End To End Tests Without Tokens"
make test \
	FILES=./test/integration/sync/discourse-translate.spec.js \
	COVERAGE=1 \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

END=$(date)
echo "START: $START"
echo "END:   $END"

curl http://monarci.com:3000/\?test\=parallel-1\&state\=stop

sleep infinity & wait
