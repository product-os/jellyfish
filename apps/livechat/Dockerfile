###########################################################
# Base
###########################################################

FROM resinci/jellyfish-base:ffea33d27 as base

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json \
	/usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app

ARG SERVER_HOST=https://api.ly.fish
ARG SERVER_PORT=443

RUN make build-livechat \
	NODE_ENV=production \
	COVERAGE=0 \
	SERVER_HOST=$SERVER_HOST \
	SERVER_PORT=$SERVER_PORT

###########################################################
# Runtime
###########################################################

FROM nginx:1.15
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf
