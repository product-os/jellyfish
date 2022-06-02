#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# shellcheck disable=SC2034
set -uae

DEBUG=${DEBUG:-false}
CERTS=${CERTS:-/certs}

[[ "${DEBUG}" =~ on|On|Yes|yes|true|True ]] && set -x

function create_cert_db {
    # https://thomas-leister.de/en/how-to-import-ca-root-certificate/
    # https://github.com/puppeteer/puppeteer/issues/2377
    certdir="${HOME}/.pki/nssdb"
    certdb="${certdir}/cert9.db"

    if ! [[ -f $certdb ]] || ! [[ -d $certdir ]]; then
        mkdir -p "${certdir}"
        certutil -N -d "sql:${certdir}" --empty-password
    fi

    certutil -A -n "balena-ca-bundle" \
      -t "TCu,Cu,Tu" \
      -i /certs/ca-bundle.pem \
      -d "sql:${certdir}"

    if [[ -f $certdb ]]; then
        certutil -L -d "sql:${certdir}"
    fi
}

if [[ -n $BALENA_DEVICE_UUID ]]; then
    tld="${BALENA_DEVICE_UUID}.${DNS_TLD}"
else
    tld="${DNS_TLD}"
fi

# shellcheck disable=SC1091
[[ -f /etc/docker.env ]] && source /etc/docker.env

INTEGRATION_BALENA_API_PRIVATE_KEY=${INTEGRATION_BALENA_API_PRIVATE_KEY:-$(cat < "${CERTS}/private/livechat.${tld}.ecdsa.key" | openssl pkcs8 -topk8 -nocrypt | openssl base64 -A)}
INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION=${INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION:-$(cat < "${CERTS}/private/livechat.${tld}.ecdsa.key" | openssl ec -pubout | openssl base64 -A)}
LIVECHAT_HOST=https://${LIVECHAT_HOST}
OAUTH_REDIRECT_BASE_URL="https://${OAUTH_REDIRECT_BASE_URL}"
REGISTRY_TOKEN_AUTH_CERT_PUB=${REGISTRY_TOKEN_AUTH_CERT_PUB:-$(cat < "${CERTS}/private/api.${tld}.pem" | openssl base64 -A)}
SERVER_HOST="https://${API_HOST}"
UI_HOST="https://${UI_HOST}"

NODE_ENV=build npm ci

create_cert_db

# don't accidentally run on instances with production data
if [[ $SUT -eq 1 ]]; then
    task "$@"
else
    echo "declare SUT=1; task $*"
fi
