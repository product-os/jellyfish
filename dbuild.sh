#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -ex

function image_variant() {
  local docker_image=$1
  local docker_tag=${2:-default}

  if [[ "${docker_tag}" == 'default' ]]; then
    echo "${docker_image}"
    return
  fi

  local image_variant="$(echo "${docker_image}" | awk -F':' '{print $2}')"
  local docker_image="$(echo "${docker_image}" | awk -F':' '{print $1}')"

  if [[ "${image_variant}" == '' ]]; then
    echo "${docker_image}:${docker_tag}"
  else
    echo "${docker_image}:${image_variant}-${docker_tag}"
  fi
}

function build() {
  path=$1; shift
  DOCKERFILE=$1; shift
  DOCKER_IMAGE=$1; shift
  publish=$1; shift
  args=$1; shift

  (
    cd $path

    if [ "${publish}" != "false" ]; then
      docker pull $(image_variant ${DOCKER_IMAGE} ${sha}) \
        || docker pull $(image_variant ${DOCKER_IMAGE} ${branch}) \
        || docker pull $(image_variant ${DOCKER_IMAGE} master) \
        || true
    fi

    docker build \
      --cache-from $(image_variant ${DOCKER_IMAGE} ${sha}) \
      --cache-from $(image_variant ${DOCKER_IMAGE} ${branch}) \
      --cache-from $(image_variant ${DOCKER_IMAGE} master) \
      ${args} \
      --build-arg RESINCI_REPO_COMMIT=${sha} \
      --build-arg CI=true \
      --build-arg NPM_TOKEN=${NPM_TOKEN} \
      -t ${DOCKER_IMAGE} \
      -f ${DOCKERFILE} .

    docker tag $(image_variant ${DOCKER_IMAGE}) $(image_variant ${DOCKER_IMAGE} latest) || true
    docker tag $(image_variant ${DOCKER_IMAGE} latest) $(image_variant ${DOCKER_IMAGE} latest)
  )
}

# Read the details of what we should build from .resinci.yml
builds=$(yq r -j .resinci.yml | jq -r ".[\"docker\"].builds" | jq -c '.[]')

echo $builds
if [ -n "$builds" ]; then
  build_pids=()
  for build in ${builds}; do
    echo ${build}
    repo=$(echo ${build} | jq -r '.docker_repo')
    dockerfile=$((echo ${build} | jq -r '.dockerfile') || echo Dockerfile)
    path=$((echo ${build} | jq -r '.path') || echo .)
    publish=$((echo ${build} | jq -r '.publish') || echo true)
    args=$((echo ${build} | jq -r '.args // [] | map("--build-arg " + .) | join(" ")') || echo "")
    if [ "$repo" == "null" ]; then
      echo "docker_repo must be set for every image. The value should be unique across the images in builds"
      exit 1
    fi
    build "$path" "$dockerfile" "$repo" "$publish" "$args" &
    build_pids+=($!)
  done
  # Waiting on a specific PID makes the wait command return with the exit
  # status of that process. Because of the 'set -e' setting, any exit status
  # other than zero causes the current shell to terminate with that exit
  # status as well.
  for pid in "${build_pids[@]}"; do
    wait "$pid"
  done
else
  if [ -f .resinci.yml ]; then
    publish=$(yq r .resinci.yml 'docker.publish')
  else
    publish=true
  fi
  build . Dockerfile $(cat .git/.version | jq -r '.base_org + "/" + .base_repo') $publish ""
fi
echo "========== Build finished =========="
if [ -f docker-compose.test.yml ]; then
  sut=$(yq read repo.yml 'sut')
  if [ "${sut}" == "null" ]; then
    sut="sut"
  fi
  COMPOSE_DOCKER_CLI_BUILD=1 docker-compose -f docker-compose.yml -f docker-compose.test.yml up --exit-code-from "${sut}"
fi
echo "========== Tests finished =========="
# Ensure we explicitly exit so we catch the signal and shut down
# the daemon. Otherwise this container will hang until it's
# killed.
exit