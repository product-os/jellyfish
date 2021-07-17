#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

ENDPOINT="$SERVER_HOST:$SERVER_PORT/readiness"
while :
do
	echo "Waiting for API at $ENDPOINT..."
	if [ "$(curl -LI "$ENDPOINT" -o /dev/null -w '%{http_code}\n' -s)" == "200" ]; then
		exit 0
	fi
	sleep 2
done
