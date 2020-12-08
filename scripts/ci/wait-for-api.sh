#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# This script is used in the sut container for the balenaCI docker pipeline.
# This is necessary to make "master" accessible, which is needed to run scripts/ci/skip_tests_if_only.sh.

set -eu

ENDPOINT="$SERVER_HOST:$SERVER_PORT/ping"
while :
do
	echo "Waiting for API at $ENDPOINT..."
	if [ "$(curl -LI "$ENDPOINT" -o /dev/null -w '%{http_code}\n' -s)" == "200" ]; then
		exit 0
	fi
	sleep 2
done
