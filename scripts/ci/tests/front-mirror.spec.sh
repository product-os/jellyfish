#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Front mirror tests.
run_test "Front Mirror Tests" test \
	FILES=./test/e2e/sync/front-mirror.spec.js \
	INTEGRATION_FRONT_TOKEN=$FRONT_TOKEN \
	INTEGRATION_INTERCOM_TOKEN=$INTERCOM_TOKEN \
	AVA_OPTS='-T 10m'
