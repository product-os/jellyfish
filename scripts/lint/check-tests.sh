#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

function assert_no_tests_in_directory () (
	echo "Checking that there are no tests in $1"
	if [ -d "$1" ]; then
		tests="$(find "$1" -name '*.spec.*')"
		if [ -n "$tests" ]; then
			echo "No test files in $1 are allowed:" 1>&2
			echo "" 1>&2
			echo "$tests" 1>&2
			exit 1
		fi
	fi
)

UI_COMPONENTS="ui chat-widget client-sdk ui-components"
APPS="$(ls -1 apps)"
NON_UI_APPS="$(echo "$APPS" | grep -v -w -F "$(echo "$UI_COMPONENTS" | tr ' ' '\n')")"

for app in $NON_UI_APPS; do
	assert_no_tests_in_directory "apps/$app"
done

for component in $UI_COMPONENTS; do
	assert_no_tests_in_directory "test/unit/$component"
done
