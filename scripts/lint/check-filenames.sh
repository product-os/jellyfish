#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

DIRECTORIES=(apps test scripts)

for file in $(find "${DIRECTORIES[@]}" -type f | grep -v -E node_modules); do
	BASENAME="$(basename "$file")"

	# Known exceptions
	if [ "$BASENAME" = "DESCRIPTION.markdown" ] || \
		[[ "$BASENAME" =~ .*LICENSE\.txt ]] || \
		[ "$BASENAME" = "README.md" ] || \
		[[ $file =~ ^apps\/.*\/build ]] || \
		[[ $BASENAME =~ ^Dockerfile ]]; then
		continue
	fi

	# Everything that is all lowercase is fine
	if ! [[ $file =~ [A-Z] ]]; then
		continue
	fi

	# JSX and TSX capitalized files are OK
	if [[ $BASENAME =~ ^[A-Z].*\.[tj]sx ]]; then
		continue
	fi

	# TODO: This whole list of exceptions shouldn't exist as React
	# components should only be defined in jellyfish-ui-components
	COMPONENTS_DIRECTORIES="apps/ui/lib/layouts/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/components/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/common/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/misc/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/full/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/list/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/actions/"
	COMPONENTS_DIRECTORIES+="|apps/ui/lib/lens/snippet/"

	# We allow lowercase files inside React component directories
	SUBPATH="$(echo "$file" | sed -E "s#^($COMPONENTS_DIRECTORIES)##g")"
	SUBPATH_DIRNAME="$(dirname "$SUBPATH")"
	SUBPATH_BASENAME="$(basename "$SUBPATH")"
	if [[ $SUBPATH_DIRNAME =~ ^[A-Z] ]] && ! [[ $SUBPATH_BASENAME =~ [A-Z] ]]; then
		continue
	fi

	echo "This file should not have capital letters:" 1>&2
	echo "" 1>&2
	echo "$file" 1>&2
	exit 1
done
