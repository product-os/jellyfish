###########################################################
# Base
###########################################################

FROM balena/open-balena-base:11.0.2 as base

ARG SERVER_HOST
ENV SERVER_HOST $SERVER_HOST

ARG SERVER_PORT
ENV SERVER_PORT $SERVER_PORT

WORKDIR /usr/src/jellyfish/apps/ui

ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
COPY ./apps/ui/package.json /usr/src/jellyfish/apps/ui/package.json
COPY ./apps/ui/package-lock.json /usr/src/jellyfish/apps/ui/package-lock.json
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/ui/Makefile /usr/src/jellyfish/apps/ui/Makefile

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/ui/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/ui && make dev-ui
#dev-copy=./.libs/ /usr/src/jellyfish/apps/ui/node_modules/@balena/
RUN rm -f ~/.npmrc
COPY ./apps/ui/lib/ /usr/src/jellyfish/apps/ui/lib/

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

FROM nginx:1.19
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/apps/ui/dist/ui /usr/share/nginx/html
COPY apps/ui/conf/nginx.conf /etc/nginx/conf.d/default.conf
