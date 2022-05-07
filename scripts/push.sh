#!/usr/bin/env bash
# shellcheck disable=SC2046
# SC2046: Allowing word splitting for balenaCLI env var arg parsing

#
# This script is a wrapper around `balena push`. The main value added here
# is the automatic inclusion of all secrets as environment variables.
# Usage: NOCACHE=1 DEBUG=1 ./scripts/push.sh
#

set -ae

DEBUG=${DEBUG:-false}

[[ "${DEBUG}" =~ on|On|Yes|yes|true|True ]] && set -x

FLAGS=()
if [ "$NOCACHE" == "1" ]; then
	FLAGS+=("--nocache")
fi
if [ "$DEBUG" == "1" ]; then
	FLAGS+=("--debug")
	set -x
fi

secrets_path=${secrets_path:-.balena/secrets}
balena_device_uuid=${SHORT_UUID:-jel.ly.fish}

get_default_env () {
    for kv in $(cat < package.json | jq -r '.balena.environment[] | select(.serviceName == null).name + "=" + .value'); do
        name="$(echo "${kv}" | awk -F'=' '{print $1}')"
        value="$(echo "${kv}" | awk -F'=' '{print $2}')"
        echo "--env ${name}=${value} "
    done
}

get_service_env () {
    for kvv in $(cat < package.json | jq -r '.balena.environment[] | select(.serviceName != null).serviceName + ":" + .name + "=" + .value'); do
        service="$(echo "${kvv}" | awk -F':' '{print $1}')"
        kv="$(echo "${kvv}" | awk -F':' '{print $2}')"
        name="$(echo "${kv}" | awk -F'=' '{print $1}')"
        value="$(echo "${kv}" | awk -F'=' '{print $2}')"
        echo "--env ${service}:${name}=${value} "
    done
}

get_default_secrets () {
    for secret in $(cat < package.json | jq -r '.balena.secrets[] | select(.serviceName == null).value'); do
        name="$(echo "${secret}" | tr '[:lower:]' '[:upper:]')"
        value="$(cat < "${secrets_path}/${secret}")"
        echo "--env ${name}=${value} "
    done
}

get_service_secrets () {
    for kv in $(cat < package.json | jq -r '.balena.secrets[] | select(.serviceName != null).serviceName + "=" + .value'); do
        service="$(echo "${kv}" | awk -F'=' '{print $1}')"
        secret="$(echo "${kv}" | awk -F'=' '{print $2}')"
        name="$(echo "${secret}" | tr '[:lower:]' '[:upper:]')"
        value="$(cat < "${secrets_path}/${secret}")"
        echo "--env ${service}:${name}=${value} "
    done
}

balena push "${balena_device_uuid}.local" "${FLAGS[@]}" \
  $(get_default_env) \
  $(get_service_env) \
  $(get_default_secrets) \
  $(get_service_secrets) \
  "$@"
