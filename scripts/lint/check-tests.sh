#!/bin/bash

set -eu

function assert_no_tests_in_directory () (
	echo "Checking that there are no tests in $1"
	if [ -d "$1" ]; then
		tests="$(find "$1" -name '*.spec.*' -and -not -path "$1/node_modules/*")"
		if [ -n "$tests" ]; then
			echo "No test files in $1 are allowed:" 1>&2
			echo "" 1>&2
			echo "$tests" 1>&2
			exit 1
		fi
	fi
)

UI_COMPONENTS="ui sdk"
for component in $UI_COMPONENTS; do
	assert_no_tests_in_directory "test/unit/$component"
done
