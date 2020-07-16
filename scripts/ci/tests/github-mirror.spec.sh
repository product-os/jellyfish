#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run GitHub mirror tests.
run_test "GitHub Mirror Tests" test \
	FILES=./test/e2e/sync/github-mirror.spec.js \
	INTEGRATION_GITHUB_TOKEN=$GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$GITHUB_SIGNATURE_KEY \
	INTEGRATION_GITHUB_PRIVATE_KEY=$GITHUB_PRIVATE_KEY \
	INTEGRATION_GITHUB_APP_ID=$GITHUB_APP_ID \
	AVA_OPTS='-T 10m'
