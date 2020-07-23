#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run Livechat end-to-end tests.
run_test "Livechat End-to-End Tests" test-e2e-livechat

# Run UI end-to-end tests.
run_test "UI End-to-End Tests" test-e2e-ui INTEGRATION_OUTREACH_APP_ID=

# Run S3 file upload tests.
run_test "S3 File Upload Tests" test \
  FILES=./test/e2e/ui/file-upload.spec.js \
	FS_DRIVER=s3FS
