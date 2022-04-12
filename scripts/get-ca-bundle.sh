#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

# Get certificate manager container ID
cert_manager=$(DOCKER_HOST=${SHORT_UUID}.local docker ps \
  --filter "name=cert-manager" \
  --format "{{.ID}}")

# Copy certificate from container to local filesystem
DOCKER_HOST=${SHORT_UUID}.local docker cp \
  "${cert_manager}":/certs/private/ca-bundle."${LONG_UUID}"."${TLD}".pem balena/

# Export path to certificate in local filesystem
NODE_EXTRA_CA_CERTS="$(pwd)/balena/ca-bundle.${LONG_UUID}.${TLD}.pem"
export NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS"
