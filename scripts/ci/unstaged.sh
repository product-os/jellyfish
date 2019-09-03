#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

OUTPUT="$(git status -s)"

if [ -n "$OUTPUT" ]; then
	echo "$OUTPUT"
	git --no-pager diff
	echo ""
	echo "There are unstaged changes" 1>&2
	exit 1
fi
