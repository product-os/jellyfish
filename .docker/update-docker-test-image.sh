#!/bin/bash

###
# Copyright 2018 resin.io
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
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
