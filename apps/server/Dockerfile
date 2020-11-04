FROM balena/open-balena-base:11.0.1

WORKDIR /usr/src/jellyfish/apps/server

COPY apps/server/package*.json /usr/src/jellyfish/apps/server/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN NODE_ENV=production npm ci
RUN rm -f ~/.npmrc

COPY ./package.json /usr/src/jellyfish/
COPY ./apps/server/lib/ /usr/src/jellyfish/apps/server/lib/
COPY ./apps/server/Makefile /usr/src/jellyfish/apps/server/

# Production debugging scripts
COPY ./scripts/production /usr/src/jellyfish/scripts/production

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
