#!/bin/bash

# If any command fails, exit with a failure code
set -e

DB_NAME="jellyfish_prod"

# Linters
echo "Running linters"
npm run lint


echo "Running tests"
npm run test:command

# If the --with-restore flag is set, then a production backup is restored and the
# tests are run again, against the restored backup.
if [[ $* == *--with-restore* ]]; then
	# Import the latest production backup and restore it to rethinkdb
	echo "Importing latest production backup"
	TARGET_DATABASE="$DB_NAME" ./scripts/import-latest-production-backup.sh

	echo "Sanitizing user emails and passwords"
	TARGET_DATABASE="$DB_NAME" ./scripts/sanitize-users.js

	echo "Running tests against production backup"
	TEST_DB_NAME="$DB_NAME" npm run test:command
fi
