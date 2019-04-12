#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MAX=5

for ((count=0; count<MAX; count++))
do
	echo "--------------------------------------------------"
	echo "Loop $((count+1)) of $MAX"
	echo "--------------------------------------------------"
	make test COVERAGE=0 LOGLEVEL=error FILES="./test/e2e/ui/*.spec.js"
done
