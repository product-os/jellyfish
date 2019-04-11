#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

DIRECTORIES="lib test scripts stress"

# Ignore .tsx and .d.ts files
RESULT="$(find "$DIRECTORIES" | grep -v -E '\.tsx$|\.d\.ts$' | grep '/[A-Z]' || true)"

if [ -n "$RESULT" ]; then
	echo "These files should not have capital letters:" 1>&2
	echo "" 1>&2
	echo "$RESULT" 1>&2
	exit 1
fi
