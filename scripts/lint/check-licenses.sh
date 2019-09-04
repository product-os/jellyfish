#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

LICENSE="/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */"

LICENSE_SHEBANG="#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */"

JAVASCRIPT_FILES="$(find . -name '*.js?' \
	-and -not -path './*node_modules/*' \
	-and -not -path './coverage/*' \
	-and -not -path './dist/*' \
	-and -not -path './.tmp/*')"

for file in $JAVASCRIPT_FILES; do
	# Exceptions
	if [ "$file" = "./lib/core/backend/postgres/streams/pg-live-select/trigger-sql.js" ] || \
		[ "$file" = "./lib/core/backend/postgres/streams/pg-live-select/index.js" ] || \
		[ "$file" = "./lib/core/backend/postgres/streams/pg-live-select/payload.js" ]; then
		continue
	fi

	if [ "$(head -n 5 "$file")" != "$LICENSE" ] && \
		[ "$(head -n 7 "$file")" != "$LICENSE_SHEBANG" ]; then
		echo "Invalid license header: $file" 1>&2
		echo "Should be:" 1>&2
		echo "" 1>&2
		echo "$LICENSE" 1>&2
		echo "" 1>&2
		echo "Or:" 1>&2
		echo "" 1>&2
		echo "$LICENSE_SHEBANG" 1>&2
		exit 1
	fi
done
