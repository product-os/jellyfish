#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

API_URL="https://circleci.com/api/v1.1/project/github/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/$CIRCLE_BUILD_NUM"

get_artifact_link() (
	curl --retry 5 -u "$CIRCLE_TOKEN:" "$API_URL/artifacts" | jq -r ".[] | select(.path==\"$1\") .url"
)

echo "Ship shape and ready to sail!"
echo ""
echo "- [PostgreSQL Dump (e2e/server)]($(get_artifact_link "test-results/dump-server.gz"))"
echo "- [PostgreSQL Dump (e2e/sdk)]($(get_artifact_link "test-results/dump-sdk.gz"))"
echo "- [PostgreSQL Dump (e2e/sync)]($(get_artifact_link "test-results/dump-sync.gz"))"
echo "- [PostgreSQL Dump (e2e/ui)]($(get_artifact_link "test-results/dump-ui.gz"))"
echo "- [PostgreSQL Dump (e2e/livechat)]($(get_artifact_link "test-results/dump-livechat.gz"))"
echo ""
./scripts/ci/hotfiles.sh
