#!/bin/bash

set -eu

MAX=20

for ((count=0; count<MAX; count++))
do
	echo "--------------------------------------------------"
	echo "Loop $((count+1)) of $MAX"
	echo "--------------------------------------------------"

	# Looks like a lot of the sporadic UI tests start happening
	# when we run the UI tests with some other tests in the background
	make test COVERAGE=0 LOGLEVEL=error FILES="./test/integration/ui/*.spec.js test/integration/sdk/*.spec.js"
done
