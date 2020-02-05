###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-sidecar

WORKDIR /usr/src/jellyfish

COPY ./scripts ./scripts
COPY package.json package-lock.json /usr/src/jellyfish/
RUN npm ci

COPY ./lib/core ./lib/core
COPY ./lib/chat-widget ./lib/chat-widget
COPY ./lib/environment ./lib/environment
COPY ./lib/sdk ./lib/sdk
COPY ./lib/sync ./lib/sync
COPY ./lib/uuid ./lib/uuid
COPY ./lib/mail ./lib/mail

COPY ./test ./test
COPY ./Makefile ./Makefile

# Sleep forever
# See: https://stackoverflow.com/a/35770783
CMD exec /bin/bash -c "trap : TERM INT; sleep infinity & wait"
