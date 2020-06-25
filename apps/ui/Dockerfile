###########################################################
# Base
###########################################################

FROM scratch AS preface

COPY apps/ui ./apps/ui

FROM jellyfish-ui-base AS base

COPY --from=preface . .

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
