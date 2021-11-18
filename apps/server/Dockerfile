FROM balena/open-balena-base:v12.2.0

WORKDIR /usr/src/jellyfish

COPY ./apps/server/package.json /usr/src/jellyfish/apps/server/package.json
COPY ./apps/server/package-lock.json /usr/src/jellyfish/apps/server/package-lock.json
RUN cd apps/server && npm ci

COPY ./package.json ./Makefile /usr/src/jellyfish/
COPY ./apps/server/tsconfig.json /usr/src/jellyfish/apps/server/tsconfig.json
COPY ./apps/server/tsconfig.build.json /usr/src/jellyfish/apps/server/tsconfig.build.json

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/server/nodemon.json /usr/src/jellyfish/apps/server/nodemon.json
#dev-copy=./apps/server/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/server && npx nodemon --inspect=0.0.0.0 ./lib/index.ts
#dev-copy=./.libs/ /usr/src/jellyfish/apps/server/node_modules/@balena/
COPY ./apps/server/lib/ /usr/src/jellyfish/apps/server/lib/
RUN cd apps/server && npm run build

# Production debugging scripts
COPY ./scripts/production /usr/src/jellyfish/scripts/production

ENV OAUTH_REDIRECT_BASE_URL https://jel.ly.fish

RUN echo "#!/bin/sh" > run.sh && \
	make --dry-run start-server >> run.sh && \
	chmod +x run.sh && cat run.sh
CMD [ "sh", "run.sh" ]
