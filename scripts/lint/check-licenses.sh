#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

LICENSE_JS="/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */"

LICENSE_SHEBANG_JS="#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */"

LICENSE_SHEBANG_SH="#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###"

JAVASCRIPT_FILES="$(find . \( -name '*.js' -or -name '*.jsx' \) \
	-and -not -path './*node_modules/*' \
	-and -not -path './dist/*' \
	-and -not -path './.tmp/*')"

SHELL_FILES="$(find . -name '*.sh' \
	-and -not -path './*node_modules/*' \
	-and -not -path './dist/*' \
	-and -not -path './.tmp/*')"

for file in $JAVASCRIPT_FILES; do
	if [ "$(head -n 5 "$file")" != "$LICENSE_JS" ] && \
		[ "$(head -n 7 "$file")" != "$LICENSE_SHEBANG_JS" ]; then
		echo "Invalid license header: $file" 1>&2
		echo "Should be:" 1>&2
		echo "" 1>&2
		echo "$LICENSE_JS" 1>&2
		echo "" 1>&2
		echo "Or:" 1>&2
		echo "" 1>&2
		echo "$LICENSE_SHEBANG_JS" 1>&2
		exit 1
	fi
done

for file in $SHELL_FILES; do
	if [ "$(head -n 7 "$file")" != "$LICENSE_SHEBANG_SH" ]; then
		echo "Invalid license header: $file" 1>&2
		echo "Should be:" 1>&2
		echo "" 1>&2
		echo "$LICENSE_SHEBANG_SH" 1>&2
		exit 1
	fi
done
