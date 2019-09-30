#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

HTML="$(find lib -name '*.html')"

if [ -n "$HTML" ]; then
	echo "There can not be HTML files in lib/" 1>&2
	echo "All deployable components should live in apps/" 1>&2
	echo "" 1>&2
	echo "$HTML" 1>&2
	exit 1
fi

WEBPACK="$(find lib -name '*webpack*.js*')"

if [ -n "$WEBPACK" ]; then
	echo "There can not be webpack configuration files in lib/" 1>&2
	echo "All deployable components should live in apps/" 1>&2
	echo "" 1>&2
	echo "$WEBPACK" 1>&2
	exit 1
fi

DOCKERFILE="$(find lib -name '*Dockerfile*')"

if [ -n "$HTML" ]; then
	echo "There can not be Dockefiles in lib/" 1>&2
	echo "All deployable components should live in apps/" 1>&2
	echo "" 1>&2
	echo "$DOCKERFILE" 1>&2
	exit 1
fi
