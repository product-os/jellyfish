#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -a

mkdir -p balena

uuid=$(printf "results:\n%s", "$(sudo balena scan)" \
  | yq e '.results[] | select(.osVariant=="development").host' - \
  | awk -F'.' '{print $1}') \
  && balena_device_uuid=$(balena device "${uuid:0:7}" | grep UUID | cut -c24-)

export TLD="ly.fish.local"
export SHORT_UUID="$uuid"
export LONG_UUID="$balena_device_uuid"
