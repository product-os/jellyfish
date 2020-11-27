###########################################################
# Base
###########################################################

FROM balena/open-balena-base:11.0.2 as base

WORKDIR /usr/src/jellyfish/apps/livechat

COPY apps/livechat/package*.json /usr/src/jellyfish/apps/livechat/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc && \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci && rm -f ~/.npmrc

COPY ./apps/livechat/lib/ /usr/src/jellyfish/apps/livechat/lib/
COPY ./apps/livechat/Makefile /usr/src/jellyfish/apps/livechat/

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443
ARG SENTRY_DSN_UI=https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

RUN make build-livechat \
	NODE_ENV=production \
	SENTRY_DSN_UI=$SENTRY_DSN_UI \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT

###########################################################
# Runtime
###########################################################

FROM nginx:1.19
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/apps/livechat/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
