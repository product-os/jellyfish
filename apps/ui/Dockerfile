###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v9.4.3 as base

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN npm i

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443
ARG SENTRY_DSN_UI=https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && cd apps/ui && make dev
COPY apps/ui/ /usr/src/jellyfish/apps/ui/
RUN cd /usr/src/jellyfish/apps/ui && npm i && rm -f ~/.npmrc
COPY Makefile lerna.json /usr/src/jellyfish/
COPY webpack.config.base.js /usr/src/jellyfish/apps/ui/
COPY packages/ /usr/src/jellyfish/packages/

RUN cd /usr/src/jellyfish/apps/ui && make build \
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
