#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -uaxe

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

# https://github.com/balena-io/balena-cli/issues/2397
PATH="/root/.nvm/versions/node/v$(cat < .nvmrc)/bin:${PATH}"
export PATH

LIVECHAT_HOST="https://${LIVECHAT_HOST}"
export LIVECHAT_HOST

SERVER_HOST="https://${API_HOST}"
export SERVER_HOST

REGISTRY_TOKEN_AUTH_CERT_PUB=${REGISTRY_TOKEN_AUTH_CERT_PUB:-$(cat < "/certs/private/api.${tld}.pem" | openssl base64 -A)}
export REGISTRY_TOKEN_AUTH_CERT_PUB

UI_HOST="https://${UI_HOST}"
export UI_HOST

OAUTH_REDIRECT_BASE_URL="https://${OAUTH_REDIRECT_BASE_URL}"
export OAUTH_REDIRECT_BASE_URL

NODE_ENV=build npm ci

create_cert_db

task "$@"
