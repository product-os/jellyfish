###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v9.2.1 as base

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
RUN mkdir -p scripts/template
COPY scripts/template/package*.json \
	/usr/src/jellyfish/scripts/template/
COPY scripts/check_node_version.js /usr/src/jellyfish/scripts
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci
RUN rm -f ~/.npmrc

COPY webpack.config.base.js .
COPY apps/ui ./apps/ui
COPY lib/ui-components ./lib/ui-components
COPY lib/chat-widget ./lib/chat-widget
COPY lib/uuid ./lib/uuid
COPY Makefile .

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443
ARG SENTRY_DSN_UI=https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139

RUN make build-ui \
	NODE_ENV=production \
	SENTRY_DSN_UI=$SENTRY_DSN_UI \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT \
	OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish \
	NODE_OPTIONS=--max-old-space-size=2048
###########################################################
# Runtime
###########################################################

FROM nginx:1.15
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/dist/ui /usr/share/nginx/html
COPY apps/ui/conf/nginx.conf /etc/nginx/conf.d/default.conf
