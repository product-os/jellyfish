#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Outreach translate tests.
./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "Outreach Translate Tests" test FILES=./test/integration/sync/outreach-translate.spec.js

# Run Balena API translate tests.
./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "Balena API Translate Tests" test FILES=./test/integration/sync/balena-api-translate.spec.js

# Run GitHub translate tests.
./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "GitHub Translate Tests" test FILES=./test/integration/sync/github-translate.spec.js

# Run Flowdock translate tests.
./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "Flowdock Translate Tests" test FILES=./test/integration/sync/flowdock-translate.spec.js
