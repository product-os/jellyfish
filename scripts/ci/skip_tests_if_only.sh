#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
MODULES="$*"
set -u

if [ -z "$MODULES" ]; then
	echo "Usage: $0 <modules...>" 1>&2
	echo "" 1>&2
	echo "Examples:" 1>&2
	echo "" 1>&2
	echo "  $0 ui livechat ui-components || ava ./test/integration/core/**/*.spec.js" 1>&2
	exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# A list of the affected modules from lib/ and apps/
# that the current branch is modifying
AFFECTED_MODULES="$(git diff --name-only master..."$CURRENT_BRANCH" \
	| grep -E "^(lib|apps)" \
	| cut -d / -f 2 \
	| sort \
	| uniq)"

# If no module was actually affected, then there is no need to run the tests
if [ -z "$AFFECTED_MODULES" ]
then
	echo "No affected modules. Skipping tests..."
	exit 0
fi

# The set of modules that can cause the tests to be skipped
INPUT_MODULES="$(echo "$MODULES" | tr ' ' '\n' | sort | uniq)"
echo "INPUT_MODULES:$INPUT_MODULES"

# Skip the tests if all the affected modules are a subset of the input modules
echo "Affected modules: $(echo "$AFFECTED_MODULES" | tr '\n' ' ')"
FILTERED_MODULES="$(echo "$INPUT_MODULES" | grep --fixed-strings "$AFFECTED_MODULES" || true)"
if [ "$FILTERED_MODULES" = "$AFFECTED_MODULES" ]
then
	echo "Skipping tests..."
	exit 0
else
	exit 1
fi

