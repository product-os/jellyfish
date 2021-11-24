FROM balena/open-balena-base:v12.2.0

WORKDIR /usr/src/app

ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
COPY package*.json ./
RUN npm ci
RUN rm -f ~/.npmrc

COPY tsconfig.json tsconfig.build.json ./
COPY ./lib ./lib
RUN npm run build

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

COPY ./Makefile .
RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
