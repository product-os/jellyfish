###########################################################
# Runtime
###########################################################

FROM scratch AS preface

COPY ./scripts ./scripts

COPY ./lib/core ./lib/core
COPY ./lib/environment ./lib/environment
COPY ./lib/sync ./lib/sync
COPY ./lib/mail ./lib/mail

COPY ./test ./test

FROM jellyfish-ui-base AS base
FROM resinci/jellyfish-sidecar:v1.3.11

WORKDIR /usr/src/jellyfish

COPY --from=base /usr/src/jellyfish/lib/uuid ./lib/uuid
COPY --from=base /usr/src/jellyfish/lib/chat-widget ./lib/chat-widget
COPY --from=base /usr/src/jellyfish/node_modules ./node_modules
COPY --from=base \
    /usr/src/jellyfish/Makefile \
    /usr/src/jellyfish/package-lock.json \
    /usr/src/jellyfish/package.json \
    ./
COPY --from=preface . .

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
