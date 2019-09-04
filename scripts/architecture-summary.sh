#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MODULES="$(find lib -maxdepth 1 -mindepth 1 -type d | sort -g)"
APPS="$(find apps -maxdepth 1 -mindepth 1 -type d | sort -g)"
CWD="$(pwd)"

echo "# Jellyfish Architecture"
echo ""
echo "TODO"
echo ""
echo "## Deployable Components"
echo ""
for app in $APPS; do
	echo "Processing app $app" 1>&2
	URL="https://github.com/balena-io/jellyfish/tree/master/$app"
	echo "### [\`$app\`]($URL)"
	echo ""
	cat "$CWD/$app/DESCRIPTION.markdown"
	echo ""
done
echo "## Internal Libraries"
echo ""
echo "A set of re-usable libraries that the top level components use."
echo ""
for module in $MODULES; do
	echo "Processing module $module" 1>&2
	URL="https://github.com/balena-io/jellyfish/tree/master/$module"
	echo "### [\`$module\`]($URL)"
	echo ""
	cat "$CWD/$module/DESCRIPTION.markdown"
	echo ""
done
