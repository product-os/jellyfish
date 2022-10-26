#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -ea

[[ $VERBOSE =~ on|On|Yes|yes|true|True ]] && set -x

which curl || apk add curl --no-cache
which jq || apk add jq --no-cache

if docker inspect "${BALENA_APP_UUID}_default" --format "{{.ID}}"; then
    network="${BALENA_APP_UUID}_default"
elif docker inspect "${BALENA_APP_ID}_default" --format "{{.ID}}"; then
    network="${BALENA_APP_ID}_default"
else
    network=default
fi

# shellcheck disable=SC2153
for alias in ${ALIASES//,/ }; do
    hostname="${alias}.${DNS_TLD}"
    aliases="--alias ${hostname} ${aliases}"
done

while true; do
    # wait until the app finishes updates
    if [[ -n $BALENA_SUPERVISOR_ADDRESS ]] && [[ -n $BALENA_SUPERVISOR_API_KEY ]]; then
        while [[ "$(curl --silent --retry 3 --fail \
          "${BALENA_SUPERVISOR_ADDRESS}/v1/device?apikey=${BALENA_SUPERVISOR_API_KEY}" \
          -H "Content-Type:application/json" | jq -r '.update_pending')" =~ true ]]; do
            sleep "$(( (RANDOM % 3) + 3 ))s"
        done
        sleep "$(( (RANDOM % 5) + 5 ))s"
    fi

    # wait until haproxy is running
    while [[ "$(docker ps \
      --filter "name=haproxy" \
      --filter "label=io.balena.service-name=haproxy" \
      --filter "status=running" \
      --filter "network=${network}" \
      --format "{{.ID}}")" == '' ]]; do
        sleep "$(( (RANDOM % 3) + 3 ))s"
    done

    haproxyID="$(docker ps \
      --filter "name=haproxy" \
      --filter "label=io.balena.service-name=haproxy" \
      --filter "status=running" \
      --filter "network=${network}" \
      --format "{{.ID}}")"

    # if haproxy is new ( wasn't restarted before by us )
    if ! [[ $restartedID == "${haproxyID}" ]]; then
        echo "[haproxy-sidecar] Reconnecting haproxy to the network using aliases " "${aliases}"
        docker network disconnect "${network}" "${haproxyID}"

        # shellcheck disable=SC2086
        docker network connect --alias haproxy ${aliases} "${network}" "${haproxyID}"

        echo "[haproxy-sidecar] Restarting haproxy"
        docker restart "${haproxyID}"

        restartedID="${haproxyID}"
    fi

    sleep "$(( (RANDOM % 15) + 15 ))s"
done
