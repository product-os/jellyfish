#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MODULES="$(find lib -maxdepth 1 -mindepth 1 -type d)"
APPS="$(find apps -maxdepth 1 -mindepth 1 -type d)"
CWD="$(pwd)"
NAME="DESCRIPTION.markdown"

for module in $MODULES; do
	DESCRIPTION="$CWD/$module/$NAME"
	if [ ! -f "$DESCRIPTION" ]; then
		echo "No module description at $DESCRIPTION" 1>&2
		exit 1
	fi
done

for app in $APPS; do
	DESCRIPTION="$CWD/$app/$NAME"
	if [ ! -f "$DESCRIPTION" ]; then
		echo "No app description at $DESCRIPTION" 1>&2
		exit 1
	fi
done
