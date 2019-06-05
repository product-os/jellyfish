###########################################################
# Base
###########################################################

FROM resinci/jellyfish-base:3daf0d44 as base

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN mkdir -p scripts/eslint-plugin-jellyfish
COPY scripts/eslint-plugin-jellyfish/package.json /usr/src/app/scripts/eslint-plugin-jellyfish
RUN npm ci
COPY . /usr/src/app

###########################################################
# Test
###########################################################

FROM resinci/jellyfish-test:8e6b2a01 as test

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app

RUN service redis-server start && \
		service postgresql start && \
		su - postgres -c "psql -U postgres -d postgres -c \"alter user postgres with password 'postgres';\"" && \
		make lint && \
		make test-unit COVERAGE=0 && \
		make test-integration COVERAGE=0 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres

###########################################################
# Runtime
###########################################################

FROM resinci/jellyfish-base:3daf0d44 as runtime

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app
RUN NODE_ENV=production npm ci

CMD [ "make", "start-server", "OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish" ]
