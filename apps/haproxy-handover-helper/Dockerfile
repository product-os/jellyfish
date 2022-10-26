FROM balena/open-balena-base:v13.5.1

WORKDIR /usr/src/haproxy-handover-helper

COPY ./package.json /usr/src/haproxy-handover-helper/package.json
COPY ./package-lock.json /usr/src/haproxy-handover-helper/package-lock.json
RUN npm ci

COPY ./tsconfig.json /usr/src/haproxy-handover-helper/tsconfig.json
COPY ./tsconfig.build.json /usr/src/haproxy-handover-helper/tsconfig.build.json

COPY ./lib/ /usr/src/haproxy-handover-helper/lib/
COPY ./haproxy-backend.json /usr/src/haproxy-handover-helper/haproxy-backend.json
COPY ./@types/ /usr/src/haproxy-handover-helper/@types/
COPY ./tslint.json /usr/src/haproxy-handover-helper/tslint.json
# RUN npm run lint
RUN npm run build

CMD [ "node", "--abort-on-uncaught-exception", "--stack-trace-limit=100", "build/index.js"]
