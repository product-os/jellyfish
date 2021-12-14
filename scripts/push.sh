#!/usr/bin/env bash
# shellcheck disable=SC2046
# SC2046: Allowing word splitting for balenaCLI env var arg parsing

#
# This script is a wrapper around `balena push`. The main value added here
# is the automatic inclusion of all secrets as environment variables.
# Usage: NOCACHE=1 DEBUG=1 ./scripts/push.sh
#

FLAGS=()
if [ "$NOCACHE" == "1" ]; then
	FLAGS+=("--nocache")
fi
if [ "$DEBUG" == "1" ]; then
	FLAGS+=("--debug")
fi

get_secrets () {
	find .balena/secrets -type f -not -name "*.secret" -print0 | while read -r -d $'\0' SECRET; do
		NAME="$(basename "$SECRET")"
		VALUE="$(cat "$SECRET")"
		echo -n "--env ${NAME^^}=$VALUE "
	done
}

balena push jel.ly.fish.local "${FLAGS[@]}" --env NODE_ENV=development $(get_secrets)
