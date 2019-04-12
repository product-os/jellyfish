#!/bin/sh

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

URL="$1"

set -eu

if ! command -v ab 2>/dev/null 1>&2; then
	echo "Please install ab (Apache Bench) to continue" 1>&2
	exit 1
fi

if [ -z "$URL" ]; then
	echo "Usage: $0 <url>" 1>&2
	echo "" 1>&2
	echo "Examples:" 1>&2
	echo "" 1>&2
	echo " $0 http://localhost:8000" 1>&2
	echo " $0 https://api.ly.fish" 1>&2
	exit 1
fi

run() {
	echo "-----------------------------------------------"
	echo "$3 /$4 - $1 requests with concurrency $2"
	echo "-----------------------------------------------"
	/usr/sbin/ab -n "$1" -c "$2" -m "$3" "$URL/$4"
}

run 1000 30 GET ping
