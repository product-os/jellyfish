#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
set -u

./scripts/docker-push-dockerfile.sh \
	.circleci/Dockerfile resinci jellyfish-test
