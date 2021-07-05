#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
set -u

OUT="dump.gz"

echo "Creating dump at $OUT"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
	--file "$OUT" \
	--compress 5 \
	--dbname "$POSTGRES_DATABASE" \
	--host "$POSTGRES_HOST" \
	--port "$POSTGRES_PORT" \
	--username "$POSTGRES_USER"

echo "Dump created at $OUT"
