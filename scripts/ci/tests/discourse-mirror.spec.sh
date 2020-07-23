#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Discourse mirror tests.
run_test "Discourse Mirror Tests" test FILES=./test/e2e/sync/discourse-mirror.spec.js
