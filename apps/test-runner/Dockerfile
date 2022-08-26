# https://github.com/product-os/jellyfish-base-images
# https://registry.hub.docker.com/r/resinci/jellyfish-test
FROM resinci/jellyfish-test:v4.0.10 AS base

WORKDIR /usr/src/jellyfish

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
COPY ./apps/server ./apps/server
COPY ./test ./test
COPY ./scripts ./scripts
COPY ./tslint.json ./tslint.json
COPY ./Taskfile.yml ./Taskfile.yml
COPY ./playwright.config.js ./playwright.config.js
COPY ./.eslint* ./
COPY ./functions ./functions
COPY ./.git .
COPY ./apps/test-runner/start-jellyfish-test-runner.sh ./apps/test-runner/start-jellyfish-test-runner.sh
# --- run unit tests
FROM base AS test

ARG CI=1
ARG SUT=1

WORKDIR /usr/src/jellyfish

# --- Local Mode livepush
#dev-copy=. ./
#dev-run=systemctl enable confd
#dev-cmd-live=/usr/bin/entry.sh
# --- stops here

SHELL [ "/bin/bash", "-c" ]

RUN [[ $SUT -eq 1 ]] && npm ci && task lint


# --- tests runtime
FROM base

ENV CI 1

WORKDIR /usr/src/jellyfish

RUN systemctl enable confd