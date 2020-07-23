#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Front mirror tests.
run_test "Front Mirror Tests" test FILES=./test/e2e/sync/front-mirror.spec.js
