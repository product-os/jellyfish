#!/bin/bash

set -eu

MAX=2

for ((count=0; count<MAX; count++))
do
	echo "--------------------------------------------------"
	echo "Loop $((count+1)) of $MAX"
	echo "--------------------------------------------------"
	make test LOGLEVEL=error FILES="./test/e2e/ui/*.spec.js"
done
