FROM resinci/jellyfish-test as base

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app
RUN make build NODE_ENV=production SENTRY_DSN_UI="https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139"

RUN service redis-server start && \
		service postgresql start && \
		su - postgres -c "psql -U postgres -d postgres -c \"alter user postgres with password 'postgres';\"" && \
		make lint && \
		make test-unit DATABASE=postgres COVERAGE=0 && \
		make test-integration DATABASE=postgres COVERAGE=0 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres

CMD [ "make", "start-server" ]
