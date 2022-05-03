###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v13.3.0 as base

WORKDIR /usr/src/jellyfish/apps/ui

COPY ./apps/ui/package.json /usr/src/jellyfish/apps/ui/package.json
COPY ./apps/ui/package-lock.json /usr/src/jellyfish/apps/ui/package-lock.json
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/ui /usr/src/jellyfish/apps/ui

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/ui/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/ui && npm run dev
#dev-copy=./.libs/ /usr/src/jellyfish/apps/ui/node_modules/@balena/

RUN npm run build

###########################################################
# Runtime
###########################################################

FROM nginx:1.21.6
WORKDIR /usr/share/nginx/html
COPY --from=base /usr/src/jellyfish/apps/ui/dist/ui /usr/share/nginx/html
COPY apps/ui/conf/env.sh /tmp
COPY apps/ui/conf/nginx.conf /etc/nginx/conf.d/default.conf

# Make our shell script executable
RUN chmod +x /tmp/env.sh

# Start Nginx server
CMD ["/bin/bash", "-c", "/tmp/env.sh && nginx -g \"daemon off;\""]
