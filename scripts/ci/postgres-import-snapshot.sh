#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
ARGV_SNAPSHOT="$1"
set -u

if [ -z "$ARGV_SNAPSHOT" ]; then
	echo "Usage: $0 <snapshot>" >&2
	exit 1
fi

DATABASE="$POSTGRES_DATABASE"
OWNER="$POSTGRES_USER"

PGPASSWORD="$POSTGRES_PASSWORD" psql template1 \
	--host="$POSTGRES_HOST" --username="$POSTGRES_USER" \
	-c "create user $OWNER;" || true
PGPASSWORD="$POSTGRES_PASSWORD" psql template1 \
	--host="$POSTGRES_HOST" --username="$POSTGRES_USER" \
	-c "drop database $DATABASE;" || true
PGPASSWORD="$POSTGRES_PASSWORD" psql template1 \
	--host="$POSTGRES_HOST" --username="$POSTGRES_USER" \
	-c "create database $DATABASE with owner $OWNER;" || true
PGPASSWORD="$POSTGRES_PASSWORD" psql "$DATABASE" \
	--host="$POSTGRES_HOST" --username="$POSTGRES_USER" < "$ARGV_SNAPSHOT"
