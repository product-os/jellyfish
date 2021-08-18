###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v11.3.12 as base

ARG SERVER_HOST
ENV SERVER_HOST $SERVER_HOST

ARG SERVER_PORT
ENV SERVER_PORT $SERVER_PORT

WORKDIR /usr/src/jellyfish/apps/livechat

ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
COPY ./apps/livechat/package.json /usr/src/jellyfish/apps/livechat/package.json
COPY ./apps/livechat/package-lock.json /usr/src/jellyfish/apps/livechat/package-lock.json
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/livechat/Makefile /usr/src/jellyfish/apps/livechat/Makefile
COPY ./apps/livechat/tsconfig.json ./apps/livechat/webpack.config.js ./

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/livechat/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/livechat && make dev-livechat
#dev-copy=./.libs/ /usr/src/jellyfish/apps/livechat/node_modules/@balena/
RUN rm ~/.npmrc
COPY ./apps/livechat/lib/ /usr/src/jellyfish/apps/livechat/lib/

ARG SENTRY_DSN_UI=https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

ENV SERVER_HOST=${SERVER_HOST:-https://api.ly.fish}
ENV SERVER_PORT=${SERVER_PORT:-443}

RUN make build-livechat \
	NODE_ENV=production \
	SENTRY_DSN_UI=$SENTRY_DSN_UI \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT

###########################################################
# Runtime
###########################################################

FROM nginx:1.21.1
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/apps/livechat/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
