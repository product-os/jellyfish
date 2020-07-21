#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
LOCAL_DOTENV_FILE="$1"
CUSTOM_DOTENV_FILE="$2"
MERGED_DOTENV_FILE="$3"
set -u

# Merge the contents of local and custom dotenv files into a new file
if [ -f "$CUSTOM_DOTENV_FILE" ]; then
	sort -u -t '=' -k 1,1 "$CUSTOM_DOTENV_FILE" "$LOCAL_DOTENV_FILE" | grep -v '^$\|^\s*\#' > "$MERGED_DOTENV_FILE"
fi
