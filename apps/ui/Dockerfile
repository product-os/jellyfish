###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v10.1.1 as base

WORKDIR /usr/src/jellyfish/apps/ui

COPY apps/ui/package*.json /usr/src/jellyfish/apps/ui/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc && \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm i

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && cd apps/ui && make build-dev-ui && make start-static-ui
RUN rm -f ~/.npmrc
COPY package.json Makefile lerna.json /usr/src/jellyfish/
COPY ./apps/ui/Makefile /usr/src/jellyfish/apps/ui/
COPY ./apps/ui/lib/ /usr/src/jellyfish/apps/ui/lib/
COPY packages/ /usr/src/jellyfish/packages/

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443
ARG SENTRY_DSN_UI=https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

RUN make build-ui \
	NODE_ENV=production \
	SENTRY_DSN_UI=$SENTRY_DSN_UI \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT \
	OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish \
	NODE_OPTIONS=--max-old-space-size=3072

###########################################################
# Runtime
###########################################################

FROM nginx:1.15
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/apps/ui/dist/ui /usr/share/nginx/html
COPY apps/ui/conf/nginx.conf /etc/nginx/conf.d/default.conf
