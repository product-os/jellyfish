#!/bin/sh

# If any command fails, exit with a failure code
set -e

# Linters
echo "Running linters"
npm run lint

# If the --skip-restore flag is set, then don't pull a production backup.
# This is useful for development testing
if [[ $* == *--skip-restore* ]]; then
	echo "Skipping restore step..."
else
	# Import the latest production backup and restore it to rethinkdb
	echo "Importing latest production backup"
	./scripts/import-latest-production-backup.sh

	echo "Sanitizing user emails and passwords"
	./scripts/sanitize-users.js
fi

echo "Running tests"
npm run test:command
