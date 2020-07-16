#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Discourse translate tests.
CHECK_FOR=discourse-translate.spec.js ./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "Discourse Translate Tests" test FILES=./test/integration/sync/discourse-translate.spec.js
