#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

# Run UI end-to-end tests.
run_test "UI End-to-End Tests" test-e2e-ui \
	POSTGRES_HOST=$LOCAL_POSTGRES_HOST \
	POSTGRES_USER=$LOCAL_POSTGRES_USER \
	POSTGRES_PASSWORD=$LOCAL_POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$LOCAL_POSTGRES_DATABASE \
	REDIS_HOST=localhost \
	REDIS_PASSWORD= \
	INTEGRATION_OUTREACH_APP_ID=
