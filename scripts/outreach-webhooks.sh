#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
COMMAND="$1"
SUBCOMMAND="$2"
TOKEN="$OUTREACH_TOKEN"
SECRET="$OUTREACH_SECRET"
set -u

usage() {
	echo "Usage: $0 <command>" 1>&2
	echo "" 1>&2
	echo "This is command line tool to manage Outreach webhooks." 1>&2
	echo "" 1>&2
	echo "Environment:" 1>&2
	echo "" 1>&2
	echo "    OUTREACH_TOKEN   Your Outreach access token" 1>&2
	echo "    OUTREACH_SECRET  Webhook secret, used by the 'add' command" 1>&2
	echo "" 1>&2
	echo "Commands:" 1>&2
	echo "" 1>&2
	echo "    ls          List all configured webhooks" 1>&2
	echo "    add <url>   Configure webhooks to a certain url" 1>&2
	echo "    rm <id>     Remove a webhook by id" 1>&2
	echo "" 1>&2
	echo "Examples:" 1>&2
	echo "" 1>&2
	echo "    $0 ls" 1>&2
	echo "    $0 add https://webhook.site/#!/750e2841-e8dd-4f6f-b7db-8951431081c7" 1>&2
	echo "    $0 rm 3" 1>&2
	exit 1
}

if [ -z "$COMMAND" ]; then
	usage
fi

if ! [ -x "$(command -v http)" ]; then
  echo "You need to install HTTPie" >&2
  exit 1
fi

if [ -z "$TOKEN" ]; then
	echo "No Outreach token in environment" 1>&2
	exit 1
fi

if [ "$COMMAND" = "ls" ]; then
	http GET https://api.outreach.io/api/v2/webhooks Authorization:"Bearer $TOKEN"
	exit 0
fi

if [ "$COMMAND" = "rm" ]; then
	if [ -z "$SUBCOMMAND" ]; then
		echo "Missing id" 1>&2
		exit 1
	fi

	http DELETE "https://api.outreach.io/api/v2/webhooks/$SUBCOMMAND" \
		Authorization:"Bearer $TOKEN"
	exit 0
fi

if [ "$COMMAND" = "add" ]; then
	if [ -z "$SUBCOMMAND" ]; then
		echo "Missing webhook URL" 1>&2
		exit 1
	fi

	if [ -z "$SECRET" ]; then
		echo "No Outreach secret in environment" 1>&2
		exit 1
	fi

	echo "{
		\"data\": {
			\"type\": \"webhook\",
			\"attributes\": {
				\"action\": \"*\",
				\"resource\": \"sequence\",
				\"secret\": \"$SECRET\",
				\"url\": \"$SUBCOMMAND\"
			}
		}
	}" | http POST https://api.outreach.io/api/v2/webhooks Authorization:"Bearer $TOKEN"

	exit 0
fi
