FROM balena/open-balena-base:v9.4.3

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN npm i

#dev-cmd-live=cd /usr/src/jellyfish && make bootstrap && cd apps/server && npx nodemon ./index.js
RUN rm -f ~/.npmrc
COPY apps/server/ /usr/src/jellyfish/apps/server/
COPY Makefile lerna.json /usr/src/jellyfish/
COPY packages/ /usr/src/jellyfish/packages/

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
