#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# This script is used to check in CI that the latest commit is a version
# commit by VersionBot to ensure that the previous merge was released.
# Usage: ./scripts/ci/check-last-commit.sh

set -e

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "CURRENT_BRANCH:$CURRENT_BRANCH"
git checkout master >/dev/null 2>&1

LAST="$(git --no-pager log -1 --pretty='%cn,%s')"
echo "LAST:$LAST"
if ! [[ "$LAST" =~ ^VersionBot,v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Last commit not new version from VersionBot, previous release may have failed."
	echo "Last commit: $(git --no-pager log -1)"
	exit 1
fi

git checkout "$CURRENT_BRANCH" >/dev/null 2>&1
