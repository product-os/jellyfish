#!/bin/sh

# This script downloads the latest production database backup and restores it to
# a rethinkdb running on localhost.
# The script requires that you provide a compise.io API token using the
# `COMPOSE_TOKEN` environment variable.
# By default the backup is restored to a database with the name `jellyfish_production_data`,
# this can be overridden using the `TARGET_DATABASE` environment variable

set -e
TOKEN="$COMPOSE_TOKEN"
set -u

FOLDER="jellyfish_production_data"
DATABASE=${TARGET_DATABASE:-"$FOLDER"}

if [ -z "$TOKEN" ]; then
  echo "Please set the COMPOSE_TOKEN environment variable" 1>&2
  exit 1
fi

COMPOSE_API_PREFIX=https://api.compose.io/2016-07

# The Jellyfish production instance
DEPLOYMENT_ID=5a941f82eddb0ae421771519

BACKUP_PATH="$(curl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/hal+json" \
  "$COMPOSE_API_PREFIX/deployments/$DEPLOYMENT_ID/backups" \
  | jq -r '._embedded.backups[0]._links.self.href')"

BACKUP_URL="$(curl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/hal+json" \
  "$COMPOSE_API_PREFIX/$BACKUP_PATH" \
  | jq -r '.download_link')"

OUTPUT="jellyfish-backup.tar.gz"
echo "Downloading $BACKUP_URL"
wget -O "$OUTPUT" "$BACKUP_URL"

# Rethinkdb provides no method for changing the database that you import into.
# As a workaround, the tarball is unpacked and the data directory is renamed
# See https://github.com/rethinkdb/rethinkdb/issues/4274
mkdir -p "$FOLDER"
tar -xvzf "$OUTPUT" -C "$FOLDER" --strip-components 1

mv "$FOLDER"/jellyfish "$FOLDER"/"$DATABASE"

echo "Importing data into database: $DATABASE"

rethinkdb import -d "$FOLDER" --connect localhost
rm "$OUTPUT"
rm -rf "$FOLDER"
