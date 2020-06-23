#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Front translate tests.
CHECK_FOR=front-translate.spec.js ./scripts/ci/skip_tests_if_only.sh ui ui-components chat-widget livechat || \
	run_test "Front Translate Tests" test FILES=./test/integration/sync/front-translate.spec.js
