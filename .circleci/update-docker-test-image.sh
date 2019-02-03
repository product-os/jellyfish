#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -e
set -u

DOCKER_OWNER="resinci"
IMAGE_ID="jellyfish-test"
SHORT_COMMIT_HASH="$(git log -1 --format="%h")"
IMAGE_NAME="$DOCKER_OWNER/$IMAGE_ID"

echo "Building Dockerfile as $IMAGE_ID"
docker build -f .circleci/Dockerfile -t "$IMAGE_ID" .

for tag in "$SHORT_COMMIT_HASH" latest; do
  IMAGE_FULLNAME="$IMAGE_NAME:$tag"
  echo "Tagging $IMAGE_ID as $IMAGE_FULLNAME"
  docker tag "$IMAGE_ID" "$IMAGE_FULLNAME"
  echo "Pushing $IMAGE_FULLNAME"
  docker push "$IMAGE_FULLNAME"
done
