FROM balena/open-balena-base:v10.1.1

COPY package*.json /usr/src/jellyfish/
RUN cd /usr/src/jellyfish && npm i

WORKDIR /usr/src/jellyfish/apps/server
COPY apps/server/package*.json /usr/src/jellyfish/apps/server/
ARG NPM_TOKEN
RUN echo "registry=http://192.168.1.3:4873" > ~/.npmrc && npm i

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && cd apps/server && npx nodemon ./lib/index.js
RUN rm -f ~/.npmrc
COPY package.json lerna.json Makefile /usr/src/jellyfish/
COPY ./apps/server/Makefile ./apps/server/nodemon.json /usr/src/jellyfish/apps/server/
COPY ./apps/server/lib/ /usr/src/jellyfish/apps/server/lib/
COPY packages/ /usr/src/jellyfish/packages/

# Production debugging scripts
COPY ./scripts/production /usr/src/jellyfish/scripts/production

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
