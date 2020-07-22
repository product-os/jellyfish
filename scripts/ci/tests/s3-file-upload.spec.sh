#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run S3 file upload tests.
run_test "S3 File Upload Tests" test \
  FILES=./test/e2e/ui/file-upload.spec.js \
	FS_DRIVER=s3FS
