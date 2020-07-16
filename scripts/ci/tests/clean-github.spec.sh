#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Clean old GitHub test data.
run_test "Clean GitHub Test Data" clean-github GITHUB_TOKEN=$INTEGRATION_GITHUB_TOKEN
