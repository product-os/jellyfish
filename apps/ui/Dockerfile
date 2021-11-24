###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v12.2.0 as base

WORKDIR /usr/src/app

ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
COPY package*.json ./
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci
RUN rm -f ~/.npmrc

COPY . .
RUN make build-ui \
	NODE_ENV=production \
	NODE_OPTIONS=--max-old-space-size=6144

###########################################################
# Runtime
###########################################################

FROM nginx:1.21.3
WORKDIR /usr/share/nginx/html
COPY --from=base ./dist/ui /usr/share/nginx/html
COPY ./conf/env.sh /tmp
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf

# Make our shell script executable
RUN chmod +x /tmp/env.sh

# Start Nginx server
CMD ["/bin/bash", "-c", "/tmp/env.sh && nginx -g \"daemon off;\""]
