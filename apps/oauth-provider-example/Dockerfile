FROM balena/open-balena-base:v12.2.0

WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/package.json
COPY ./package-lock.json /usr/src/app/package-lock.json
RUN npm ci

COPY ./lib ./lib

#dev-copy=./nodemon.json /usr/src/app/nodemon.json
#dev-cmd-live=npx nodemon ./lib/index.js

CMD [ "npm", "start" ]
