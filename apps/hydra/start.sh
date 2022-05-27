#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# shellcheck disable=SC2034
set -ae

# shellcheck disable=SC1091
/usr/sbin/configure-balena.sh && source /etc/docker.env

POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-docker}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-docker}

PGPASSWORD=${POSTGRES_PASSWORD} psql --host "${POSTGRES_HOST}" --port "${POSTGRES_PORT}" --username "${POSTGRES_USER}" <<-EOSQL
	SELECT 'CREATE DATABASE hydra' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hydra')\gexec
EOSQL

export DSN="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/hydra?sslmode=disable"
export URLS_SELF_ISSUER=https://${HYDRA_PUBLIC_HOST}
export URLS_CONSENT=https://${UI_HOST}/oauthprovider/consent
export URLS_LOGIN=https://${UI_HOST}/oauthprovider/login
export URLS_LOGOUT=https://${UI_HOST}/oauthprovider/logout

hydra migrate sql -e -y || true
hydra serve all -c /etc/config/hydra/hydra.yml --dangerous-force-http
