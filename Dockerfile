FROM resinci/jellyfish-test as base

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app
RUN make build NODE_ENV=production

RUN rethinkdb --version && \
		rethinkdb --daemon --bind all && \
		service redis-server start && \
		make lint && \
		make test-unit COVERAGE=0

CMD [ "make", "start-server" ]
