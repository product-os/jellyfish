#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run integration tests
run_test "Core Integration Tests" test-integration-core

# Run queue integration tests.
run_test "Queue Integration Tests" test-integration-queue

# Run worker integration tests.
run_test "Worker Integration Tests" test-integration-worker \
	INTEGRATION_GOOGLE_MEET_CREDENTIALS="{}"

# Run server integration tests.
run_test "Server Integration Tests" test-integration-server \
	SERVER_HOST=http://localhost \
	POSTGRES_DATABASE=test_$(cat /proc/sys/kernel/random/uuid | cut -d - -f 1)
