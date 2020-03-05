#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
source "$(dirname $0)/helpers.sh"

#echo "UI: $UI_HOST:$UI_PORT"
#curl $UI_HOST:$UI_PORT/index.html
#echo "UI curl complete"

# Install dependencies.
echo "=== Installing dependencies"
cd $WORKDIR/scripts/template && npm install && cd $WORKDIR

# Start tasks in background and store each jobs pid in an array.
for JOB in $(find $(dirname $0)/* -type f ! \( -name "init.sh" -o -name "helpers.sh" \) | sort); do
  ${JOB} &
	PIDS+=($!)
done

# Wait for all processes and check exit codes.
for PID in ${PIDS[@]}; do
  wait ${PID}
  EXIT_CODE=($?)
  if [[ $EXIT_CODE -ne 0 ]]; then
    exit $EXIT_CODE
  fi
done
