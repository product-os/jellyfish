###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v13.0.4 as base

WORKDIR /usr/src/jellyfish/apps/livechat

COPY ./apps/livechat/package.json /usr/src/jellyfish/apps/livechat/package.json
COPY ./apps/livechat/package-lock.json /usr/src/jellyfish/apps/livechat/package-lock.json
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/livechat /usr/src/jellyfish/apps/livechat

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/livechat/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/livechat && npm run dev
#dev-copy=./.libs/ /usr/src/jellyfish/apps/livechat/node_modules/@balena/

RUN npm run build

###########################################################
# Runtime
###########################################################

FROM nginx:1.21.6
WORKDIR /usr/share/nginx/html
COPY --from=base /usr/src/jellyfish/apps/livechat/dist/livechat /usr/share/nginx/html
COPY apps/livechat/conf/env.sh /tmp
COPY apps/livechat/conf/nginx.conf /etc/nginx/conf.d/default.conf

# Make our shell script executable
RUN chmod +x /tmp/env.sh

# Start Nginx server
CMD ["/bin/bash", "-c", "/tmp/env.sh && nginx -g \"daemon off;\""]
