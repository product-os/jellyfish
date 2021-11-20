#!/bin/bash

set -eu

APPS="$(find apps -maxdepth 1 -mindepth 1 -type d)"
CWD="$(pwd)"
NAME="DESCRIPTION.markdown"

for app in $APPS; do
	DESCRIPTION="$CWD/$app/$NAME"
	if [ ! -f "$DESCRIPTION" ]; then
		echo "No app description at $DESCRIPTION" 1>&2
		exit 1
	fi
done
