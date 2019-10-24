#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

if [ "$#" -ne 1 ] ;then
	echo "keyframe path required as first argument."
	exit 1
fi

# Install kubectl
wget -O kubectl "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x ./kubectl && mv kubectl /usr/local/bin/

# Deploy with katapult
KATAPULT_KUBE_CONFIG="$(echo "$KATAPULT_KUBE_CONFIG" | base64 -d)" katapult deploy -t kubernetes -e jellfish-product
