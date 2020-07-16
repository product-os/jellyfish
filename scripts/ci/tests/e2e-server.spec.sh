#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run server end-to-end tests.
run_test "Server End-to-End Tests" test-e2e-server \
	INTEGRATION_GITHUB_TOKEN=$GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$GITHUB_SIGNATURE_KEY \
	INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
	INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY=$FLOWDOCK_SIGNATURE_KEY \
	INTEGRATION_TYPEFORM_SIGNATURE_KEY=$TYPEFORM_SIGNATURE_KEY \
	OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish
