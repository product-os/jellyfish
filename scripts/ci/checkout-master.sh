#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# This script is used in the sut container for the balenaCI docker pipeline.
# This is necessary to make "master" accessible, which is needed to run scripts/ci/skip_tests_if_only.sh.

set -eu

git config user.name "balena-ci"
git config user.email "balena-ci@balena.io"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git stash >/dev/null 2>&1
git checkout master >/dev/null 2>&1
git checkout "$CURRENT_BRANCH" >/dev/null 2>&1
git stash pop >/dev/null 2>&1
