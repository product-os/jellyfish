FROM balena/open-balena-base:v13.6.1

WORKDIR /usr/src/jellyfish/apps/server

COPY ./apps/server/package.json /usr/src/jellyfish/apps/server/package.json
COPY ./apps/server/package-lock.json /usr/src/jellyfish/apps/server/package-lock.json
RUN npm ci

COPY ./package.json /usr/src/jellyfish/package.json
COPY ./apps/server/tsconfig.json /usr/src/jellyfish/apps/server/tsconfig.json
COPY ./apps/server/tsconfig.build.json /usr/src/jellyfish/apps/server/tsconfig.build.json
COPY ./apps/server/run.sh /usr/src/jellyfish/apps/server/run.sh

COPY ./apps/server/lib/ /usr/src/jellyfish/apps/server/lib/
COPY ./apps/server/test/ /usr/src/jellyfish/apps/server/test/
COPY ./apps/server/@types/ /usr/src/jellyfish/apps/server/@types/
COPY ./apps/server/tslint.json /usr/src/jellyfish/apps/server/tslint.json
RUN npm run lint
RUN npm run build

CMD [ "npm", "start" ]
