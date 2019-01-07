FROM resinci/jellyfish-test as base

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app
RUN make build

FROM resinci/jellyfish-test as test

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

RUN rethinkdb --version && \
		rethinkdb --daemon --bind all && \
		make lint && \
		make test-unit COVERAGE=0

FROM node:dubnium-jessie as runtime

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

CMD [ "make", "start-server" ]
