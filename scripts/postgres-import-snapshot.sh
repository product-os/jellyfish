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

DATABASE=jellyfish
OWNER="jellyfishuser"

psql template1 -c "create user $OWNER;" || true
psql template1 -c "drop database $DATABASE;" || true
psql template1 -c "create database $DATABASE with owner $OWNER;" || true
psql "$DATABASE" < "$ARGV_SNAPSHOT"
