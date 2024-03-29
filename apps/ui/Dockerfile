###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v13.6.1 as base

WORKDIR /usr/src/jellyfish/apps/ui

COPY ./apps/ui/package.json /usr/src/jellyfish/apps/ui/package.json
COPY ./apps/ui/package-lock.json /usr/src/jellyfish/apps/ui/package-lock.json
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/ui /usr/src/jellyfish/apps/ui

RUN npm run build

###########################################################
# Test
###########################################################

FROM base AS test

WORKDIR /usr/src/jellyfish/apps/ui
COPY --from=base /usr/src/jellyfish/apps/ui/  /usr/src/jellyfish/apps/ui/

RUN npm run test

###########################################################
# Runtime
###########################################################

FROM nginx:1.23.3
WORKDIR /usr/share/nginx/html
COPY --from=test /usr/src/jellyfish/apps/ui/dist/ui /usr/share/nginx/html
COPY apps/ui/run.sh /usr/src/jellyfish/apps/ui/run.sh
COPY apps/ui/conf/env.sh /tmp
COPY apps/ui/conf/nginx.conf /etc/nginx/conf.d/default.conf

# Make our shell script executable
RUN chmod +x /tmp/env.sh

# Start Nginx server
CMD ["/bin/bash", "-c", "/tmp/env.sh && nginx -g \"daemon off;\""]
