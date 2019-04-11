#!/bin/sh

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
