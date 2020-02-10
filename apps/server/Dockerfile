###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v9.1.0 as base

WORKDIR /usr/src/jellyfish

ARG ENABLE_COVERAGE=0
ENV COVERAGE ${ENABLE_COVERAGE}

COPY package.json package-lock.json /usr/src/jellyfish/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/jellyfish/scripts/eslint-plugin-jellyfish
RUN mkdir -p scripts/template
COPY scripts/template/package*.json \
	/usr/src/jellyfish/scripts/template/
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./lib/action-library ./lib/action-library
COPY ./lib/assert ./lib/assert
COPY ./lib/core ./lib/core
COPY ./lib/coverage ./lib/coverage
COPY ./lib/environment ./lib/environment
COPY ./lib/logger ./lib/logger
COPY ./lib/jellyscript ./lib/jellyscript
COPY ./lib/queue ./lib/queue
COPY ./lib/sync ./lib/sync
COPY ./lib/uuid ./lib/uuid
COPY ./lib/worker ./lib/worker
COPY ./apps/server ./apps/server
COPY Makefile .

RUN make .nyc-root && \
	echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh

# Optimization: in the runtime image we to run NODE_ENV=production npm ci
# but that would require all modules to be downloaded again
# Instead, we run it in the base image, and copy node_modules from base
# to runtime INSTEAD OF running npm ci: this saves bandwidth and time
RUN NODE_ENV=production npm ci

###########################################################
# Runtime
###########################################################

FROM balena/open-balena-base:v9.1.0 as runtime

WORKDIR /usr/src/jellyfish

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

COPY package.json package-lock.json ./
COPY --from=base /usr/src/jellyfish/node_modules ./node_modules

COPY --from=base /usr/src/jellyfish/lib ./lib
COPY --from=base /usr/src/jellyfish/apps ./apps

COPY --from=base /usr/src/jellyfish/.nyc-root ./.nyc-root
COPY --from=base /usr/src/jellyfish/run.sh ./

# Production debugging scripts
COPY ./scripts/production ./scripts/production

CMD [ "sh", "run.sh" ]
