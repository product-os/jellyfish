#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
set -u

PGPASSWORD="$POSTGRES_PASSWORD" psql "$POSTGRES_DATABASE" \
	--host="$POSTGRES_HOST" \
	--username="$POSTGRES_USER"
