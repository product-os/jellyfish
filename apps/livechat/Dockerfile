###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v9.2.0 as base

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/jellyfish/scripts/eslint-plugin-jellyfish
RUN mkdir -p scripts/template
COPY scripts/template/package*.json \
	/usr/src/jellyfish/scripts/template/
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY webpack.config.base.js .
# TODO: When
# https://github.com/balena-io/jellyfish/issues/3004
# is solved, remove the below
COPY apps/ui ./apps/ui
COPY apps/livechat ./apps/livechat
COPY lib/sdk ./lib/sdk
COPY lib/ui-components ./lib/ui-components
COPY lib/chat-widget ./lib/chat-widget
COPY lib/uuid ./lib/uuid
COPY Makefile .

ARG ENABLE_COVERAGE=0
ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443

RUN make build-livechat \
	NODE_ENV=production \
	COVERAGE=${ENABLE_COVERAGE} \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT

###########################################################
# Runtime
###########################################################

FROM nginx:1.15
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
