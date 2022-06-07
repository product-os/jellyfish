#!/bin/sh

# shellcheck disable=SC2034
set -ea

[ "$VERBOSE" = 'true' ] && set -x

if [ -n "$BALENA_DEVICE_UUID" ]; then
	# prepend the device UUID if running on balenaOS
	TLD="${BALENA_DEVICE_UUID}.${DNS_TLD}"
else
	TLD="${DNS_TLD}"
fi

# shellcheck disable=SC1090
[ -f "/balena/$TLD.env" ] && . "/balena/${TLD}.env"

cat < prometheus.template \
  | sed "s/{{MONITOR_SECRET_TOKEN}}/${MONITOR_SECRET_TOKEN}/g" > prometheus.yml

exec /bin/prometheus "$@"
