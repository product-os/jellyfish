#!/bin/sh

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
TOKEN="$COMPOSE_TOKEN"
set -u

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
  | jq -r '._embedded.backups|=sort_by(.created_at)[length-1]' | jq -r '._embedded.backups._links.self.href')"

BACKUP_URL="$(curl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/hal+json" \
  "$COMPOSE_API_PREFIX/$BACKUP_PATH" \
  | jq -r '.download_link')"

OUTPUT="jellyfish-backup.tar.gz"
echo "Downloading $BACKUP_URL"
wget -O "$OUTPUT" "$BACKUP_URL"

rethinkdb restore "$OUTPUT" --connect localhost --force
rm "$OUTPUT"
