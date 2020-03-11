FROM balena/open-balena-base:v9.2.1

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
RUN mkdir -p scripts
COPY scripts/check_node_version.js /usr/src/jellyfish/scripts
RUN NODE_ENV=production npm ci

COPY ./lib/action-library ./lib/action-library
COPY ./lib/assert ./lib/assert
COPY ./lib/core ./lib/core
COPY ./lib/environment ./lib/environment
COPY ./lib/logger ./lib/logger
COPY ./lib/jellyscript ./lib/jellyscript
COPY ./lib/sync ./lib/sync
COPY ./lib/queue ./lib/queue
COPY ./lib/uuid ./lib/uuid
COPY ./lib/worker ./lib/worker
COPY ./lib/mail ./lib/mail

COPY ./apps/server ./apps/server
COPY Makefile .

# Production debugging scripts
COPY ./scripts/production ./scripts/production

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
