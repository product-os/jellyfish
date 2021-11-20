#!/bin/bash

set -eu

for app in apps/*; do
	if compgen -G "$app/Dockerfile*" > /dev/null; then
		continue
	fi

	echo "App $app does not contain a Dockerfile, but all directories" 1>&2
	echo "inside apps/ are meant to be deployable components." 1>&2
	exit 1
done
