#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MODULES="$(find lib -depth 1 -type d)"
CWD="$(pwd)"

echo "# Jellyfish Architecture"
for module in $MODULES; do
	URL="https://github.com/balena-io/jellyfish/tree/master/$module"
	echo "## [\`$module\`]($URL)"
	echo ""
	cat "$CWD/$module/README.markdown"
	echo ""
done
