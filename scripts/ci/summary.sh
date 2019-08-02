#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

API_URL="https://circleci.com/api/v1.1/project/github/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/$CIRCLE_BUILD_NUM"
ARTIFACT_COVERAGE="test-results/coverage/index.html"
ARTIFACT_GITSTATS="test-results/gitstats/index.html"
ARTIFACT_UI_WEBPACK_REPORT="test-results/webpack-bundle-report.html"
ARTIFACT_CHAT_WIDGET_WEBPACK_REPORT="test-results/webpack-bundle-report.chat-widget.html"

get_artifact_link() (
	curl -u "$CIRCLE_TOKEN:" "$API_URL/artifacts" | jq -r ".[] | select(.path==\"$1\") .url"
)

echo "Ship shape and ready to sail!"
echo ""
echo "- [Code Coverage]($(get_artifact_link "$ARTIFACT_COVERAGE"))"
echo "- [Repo Stats]($(get_artifact_link "$ARTIFACT_GITSTATS"))"
echo "- [Webpack Bundle Report for ui]($(get_artifact_link "$ARTIFACT_UI_WEBPACK_REPORT"))"
echo "- [Webpack Bundle Report for chat-widget]($(get_artifact_link "$ARTIFACT_CHAT_WIDGET_WEBPACK_REPORT"))"
echo ""
./scripts/ci/hotfiles.sh
