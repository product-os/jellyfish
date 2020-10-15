###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v10.1.1 as base

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci
RUN rm -f ~/.npmrc

COPY webpack.config.base.js .
COPY apps/livechat ./apps/livechat
COPY Makefile .

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
