###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v10.1.1 as base

WORKDIR /usr/src/jellyfish/apps/livechat

COPY apps/livechat/package*.json /usr/src/jellyfish/apps/livechat/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc && \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm i

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && make dev-livechat
RUN rm -f ~/.npmrc
COPY package.json Makefile lerna.json /usr/src/jellyfish/
COPY ./apps/livechat/Makefile /usr/src/jellyfish/apps/livechat/
COPY ./apps/livechat/lib/ /usr/src/jellyfish/apps/livechat/lib/
COPY packages/ /usr/src/jellyfish/packages/

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
COPY --from=base /usr/src/jellyfish/apps/livechat/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
