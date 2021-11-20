#!/bin/bash

set -e
set -u

PGPASSWORD="$POSTGRES_PASSWORD" psql "$POSTGRES_DATABASE" \
	--host="$POSTGRES_HOST" \
	--username="$POSTGRES_USER"
