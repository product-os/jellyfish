FROM balena/open-balena-base:v13.3.1

WORKDIR /usr/src/jellyfish/apps/server

COPY ./apps/server/package.json /usr/src/jellyfish/apps/server/package.json
COPY ./apps/server/package-lock.json /usr/src/jellyfish/apps/server/package-lock.json
RUN npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/server/tsconfig.json /usr/src/jellyfish/apps/server/tsconfig.json
COPY ./apps/server/tsconfig.build.json /usr/src/jellyfish/apps/server/tsconfig.build.json
COPY ./apps/server/run.sh /usr/src/jellyfish/apps/server/run.sh

#dev-copy=./scripts/install-packages.js /usr/src/jellyfish/scripts/install-packages.js
#dev-copy=./apps/server/nodemon.json /usr/src/jellyfish/apps/server/nodemon.json
#dev-copy=./apps/server/packages/ /usr/src/jellyfish/packages/
#dev-run=/usr/src/jellyfish/scripts/install-packages.js

#dev-cmd-live=cd /usr/src/jellyfish/apps/server && npm run dev
#dev-copy=./.libs/ /usr/src/jellyfish/apps/server/node_modules/
COPY ./apps/server/lib/ /usr/src/jellyfish/apps/server/lib/
RUN npm run build

# Production debugging scripts
COPY ./scripts/production /usr/src/jellyfish/scripts/production

CMD [ "npm", "start" ]
