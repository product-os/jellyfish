#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MODULES="$(find lib -maxdepth 1 -type d)"
CWD="$(pwd)"

for module in $MODULES; do
	README="$CWD/$module/README.markdown"
	if [ ! -f "$README" ]; then
		echo "No module description at $README" 1>&2
		exit 1
	fi
done
