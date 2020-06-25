###########################################################
# Base
###########################################################

FROM jellyfish-ui-base AS base

COPY apps/livechat ./apps/livechat

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443

RUN make build-livechat \
	NODE_ENV=production \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT

###########################################################
# Runtime
###########################################################

FROM nginx:1.15
WORKDIR /usr/src/jellyfish
COPY --from=base /usr/src/jellyfish/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
