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

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && cd apps/livechat && make dev
COPY apps/livechat/ /usr/src/jellyfish/apps/livechat/
RUN cd /usr/src/jellyfish/apps/livechat && npm i && rm -f ~/.npmrc
COPY Makefile lerna.json /usr/src/jellyfish/
COPY webpack.config.base.js /usr/src/jellyfish/apps/livechat/
COPY packages/ /usr/src/jellyfish/packages/

RUN cd /usr/src/jellyfish/apps/livechat && make build \
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
