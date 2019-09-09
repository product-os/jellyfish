#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e

if [ -z "$GITHUB_TOKEN" ]; then
	echo "Please set GITHUB_TOKEN" 1>&2
	exit 1
fi

if [ -z "$CIRCLE_TOKEN" ]; then
	echo "Please set CIRCLE_TOKEN" 1>&2
	exit 1
fi

set -u

echo "Preparing to fetch previous Postgres dump"

COMMITS="$(git log --pretty="%P %s" |
	grep "Merge pull request" |
	cut -d ' ' -f 2 |
	head -n 10)"

OWNER="balena-io"
REPO="jellyfish"

function get_statuses() {
	curl --header "Authorization: Bearer $GITHUB_TOKEN" \
		"https://api.github.com/repos/$OWNER/$REPO/commits/$1/statuses"
}

function filter_results_job() {
	jq '[.[] | select(.state == "success" and .context == "ci/circleci: results")][0]'
}

get_artifact_link() {
	curl -u "$CIRCLE_TOKEN:" "$1/artifacts" | jq -r ".[] | select(.path==\"$2\") .url"
}

for commit in $COMMITS; do
	echo "Checking GitHub statuses: $commit"
	RESULTS="$(get_statuses "$commit" | filter_results_job)"
	if [ "$RESULTS" = "null" ]; then
		echo "    --> No successful results job"
		continue
	fi

	TARGET_URL="$(echo "$RESULTS" | jq -r '.target_url' | cut -d '?' -f 1)"
	API_URL="${TARGET_URL/\/gh\///api/v1.1/project/github/}"
	echo "    --> Circle CI API: $API_URL"
	DUMP_URL="$(get_artifact_link "$API_URL" "test-results/dump.gz")"
	echo "    --> Postgres dump URL: $DUMP_URL"
	set +e
	curl -v -o dump.gz -L "$DUMP_URL?circle-token=$CIRCLE_TOKEN"
	EXIT_CODE="$?"
	set -e

	if [ "$EXIT_CODE" != "0" ]; then
		echo "    --> Failure fetching dump. Continuing..."
		continue
	else
		exit 0
	fi
done
