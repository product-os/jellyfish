#!/bin/bash

source "$(dirname $0)/helpers.sh"
START=$(date)
cd $WORKDIR

curl http://monarci.com:3000/\?test\=parallel-2\&state\=start


echo "=== Sync End To End Tests Without Tokens"
make test \
	FILES=./test/integration/sync/front-translate.spec.js \
	COVERAGE=1 \
	SCRUB=0 \
	INTEGRATION_FRONT_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE

END=$(date)
echo "START: $START"
echo "END:   $END"

curl http://monarci.com:3000/\?test\=parallel-2\&state\=stop

sleep infinity & wait
