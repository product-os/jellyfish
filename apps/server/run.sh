#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# shellcheck disable=SC2034
set -ae

[[ $VERBOSE =~ on|On|Yes|yes|true|True ]] && set -x

CERTS=${CERTS:-/certs}

# shellcheck disable=SC1091
/usr/sbin/configure-balena.sh && source /etc/docker.env

SERVER_HOST=${SERVER_HOST:-https://${API_HOST}}
UI_HOST=${UI_HOST:-https://${UI_HOST}}
OAUTH_REDIRECT_BASE_URL=https://${OAUTH_REDIRECT_BASE_URL}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
REDIS_HOST=${REDIS_HOST:-redis}
INTEGRATION_BALENA_API_PRIVATE_KEY=${INTEGRATION_BALENA_API_PRIVATE_KEY:-$(cat < "${CERTS}/private/livechat.${BALENA_DEVICE_UUID}.${DNS_TLD}.ecdsa.key" | openssl pkcs8 -topk8 -nocrypt | openssl base64 -A)}
INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION=${INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION:-$(cat < "${CERTS}/private/livechat.${BALENA_DEVICE_UUID}.${DNS_TLD}.ecdsa.key" | openssl ec -pubout | openssl base64 -A)}

cd /usr/src/jellyfish/apps/server

if [[ $BALENA_APP_NAME == 'localapp' ]] && [[ $BALENA_APP_ID -eq 1 ]]; then
		npm run dev
else
		# (TBC) should then become a systemd service (e.g jellyfish-api)
		npm start
fi
