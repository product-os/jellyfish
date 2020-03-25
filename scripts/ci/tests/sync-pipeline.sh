#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run pipeline sync tests.
run_test "Pipeline Sync Tests" test FILES=./test/integration/sync/pipeline.spec.js
