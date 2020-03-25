#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

WORKDIR="/usr/src/jellyfish"

function run_test() {
	cd $WORKDIR
	TEST_NAME=${1}
	shift
	MAKE_ARGS=${@}

	echo "=== $TEST_NAME"
	TASK_START=$(date +%s)
	make $MAKE_ARGS
	let TASK_TIME=$(date +%s)-$TASK_START
	echo "$TEST_NAME Done: $TASK_TIME seconds"
}
