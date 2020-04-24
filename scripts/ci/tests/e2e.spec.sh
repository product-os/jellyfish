#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Livechat end-to-end tests.
# Temporarily run fewer e2e tests while we resolve instability
# run_test "Livechat End-to-End Tests" test-e2e-livechat

# Run UI end-to-end tests.
run_test "UI End-to-End Tests" test-e2e-ui INTEGRATION_OUTREACH_APP_ID=
