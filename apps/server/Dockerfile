FROM balena/open-balena-base:v9.4.3

WORKDIR /usr/src/jellyfish

COPY package.json package-lock.json /usr/src/jellyfish/
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN NODE_ENV=production npm ci
RUN rm -f ~/.npmrc

COPY ./apps/server ./apps/server
COPY Makefile .

# Production debugging scripts
COPY ./scripts/production ./scripts/production

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
