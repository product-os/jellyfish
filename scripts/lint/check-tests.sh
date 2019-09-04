#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

TESTS="$(find lib apps -name '*.spec.*')"

if [ -n "$TESTS" ]; then
	echo "Invalid tests: Tests can only live in test/" 1>&2
	echo "" 1>&2
	echo "$TESTS"
	exit 1
fi
