###########################################################
# Base
###########################################################

FROM balena/open-balena-base:v5.3.1 as base

WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY package-lock.json /usr/src/app
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app

# TODO: Move this to a UI dockerfile
RUN make build NODE_ENV=production SENTRY_DSN_UI="https://ff836b1e4abc4d0699bcaaf07ce4ea08@sentry.io/1366139"

###########################################################
# Test
###########################################################

FROM balena/open-balena-base:v5.3.1 as test

RUN apt-get update && apt-get install redis-server postgresql shellcheck

# Redis will try to set ulimit at startup, and that won't work
# in non-privileged containers
RUN sed -i 's/[ \t]*ulimit.*/:/g' /etc/init.d/redis-server

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

RUN service redis-server start && \
		service postgresql start && \
		su - postgres -c "psql -U postgres -d postgres -c \"alter user postgres with password 'postgres';\"" && \
		make lint && \
		make test-unit DATABASE=postgres COVERAGE=0 && \
		make test-integration DATABASE=postgres COVERAGE=0 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres
RUN service redis-server stop && service postgresql stop

###########################################################
# Runtime
###########################################################

FROM balena/open-balena-base:v5.3.1 as runtime

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app
RUN NODE_ENV=production npm ci

CMD [ "make", "start-server" ]
