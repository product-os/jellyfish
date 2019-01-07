#!/bin/bash

set -eu

API_URL="https://circleci.com/api/v1.1/project/github/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/$CIRCLE_BUILD_NUM"
ARTIFACT_COVERAGE="test-results/coverage/lcov-report/index.html"
ARTIFACT_GITSTATS="test-results/gitstats/index.html"

get_artifact_link() (
	curl -u "$CIRCLE_TOKEN:" "$API_URL/artifacts" | jq -r ".[] | select(.path==\"$1\") .url"
)

echo "Ship shape and ready to sail!"
echo ""
echo "- [Code Coverage]($(get_artifact_link "$ARTIFACT_COVERAGE"))"
echo "- [Repo Stats]($(get_artifact_link "$ARTIFACT_GITSTATS"))"
echo ""
echo "#### Coverage Summary"
echo ""
# Remove the first and last line so we get a proper table
tail -n +2 < COVERAGE | sed '$d'
echo ""
./scripts/hotfiles.sh
