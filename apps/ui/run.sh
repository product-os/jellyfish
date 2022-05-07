#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# shellcheck disable=SC2034
set -ae

[[ $VERBOSE =~ on|On|Yes|yes|true|True ]] && set -x

# shellcheck disable=SC1091
/usr/sbin/configure-balena.sh && source /etc/docker.env

SERVER_HOST="https://${API_HOST}"
UI_HOST="https://${UI_HOST}"
OAUTH_REDIRECT_BASE_URL="https://${OAUTH_REDIRECT_BASE_URL}"

if [[ $BALENA_APP_NAME == 'localapp' ]] && [[ $BALENA_APP_ID -eq 1 ]]; then
		cd /usr/src/jellyfish/apps/ui && npm run dev
else
		/tmp/env.sh && nginx -g "daemon off;"
fi
