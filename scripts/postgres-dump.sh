#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
ARGV_OUTPUT="$1"
USER="$POSTGRES_USER"
PASSWORD="$POSTGRES_PASSWORD"
HOST="$POSTGRES_HOST"
set -u

if [ -z "$ARGV_OUTPUT" ]; then
	echo "Usage: $0 <output>" >&2
	exit 1
fi

DATABASE="jellyfish"
echo "Dumping data from database $DATABASE into $ARGV_OUTPUT"

if [ -n "$PASSWORD" ]; then
	export PGPASSWORD="$PASSWORD"
fi

pg_dump \
	--file="$ARGV_OUTPUT" \
	--format=p \
	--host="$HOST" \
	--compress=9 \
	--username="$USER" \
	"$DATABASE"
