#!/bin/bash

set -eu

MAX=5

for ((count=0; count<MAX; count++))
do
	echo "--------------------------------------------------"
	echo "Loop $((count+1)) of $MAX"
	echo "--------------------------------------------------"
	make test COVERAGE=0 LOGLEVEL=error FILES="./test/e2e/ui/*.spec.js"
done
