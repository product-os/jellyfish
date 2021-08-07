# Running tests

This document attempts to give an overview of the tests we currently have in Jellyfish and how they can be executed locally.

## Test Types
Jellyfish currently runs the following types of tests:
- Lint
- Unit
- E2E
- Integration

The source for all tests can be found under `tests/` and are executed primarily by the `make test` command. Examples can be found at the bottom of this document.

## Secrets
Most tests require a number of variables to be passed to the test runner in order for them to execute properly. For example, in order to run GitHub translate tests against the real GitHub API, you need to pass along the GitHub token and signature key.

These secrets are stored in our Passpack account and are not open for everyone in the company to see. Should you require access to these keys/tokens/secrets, ask the operations team for access.

## Options
This section attempts to define the more commonly used options used when executing tests through `make test`.  Examples of these options can be found in the examples section below.

There are several options not discussed here, but doing some `grep`ping through the Makefile and source code should lead you in the right direction.

### `FILES`
Files that should be used to run tests.
This can be a single file or several by use of path wildcards.

### `POSTGRES_HOST`
Location of the PostgreSQL server.
Defaults to `localhost`.

### `POSTGRES_PORT`
PostgreSQL server port.
Defaults to the PostgreSQL default of `5432`.

### `POSTGRES_USER`
User name used to connect to the PostgreSQL server.
Defaults to the local username (via `whoami`).

### `POSTGRES_PASSWORD`
Password used to connect to the PostgreSQL server.
Defaults to an empty string.

### `REDIS_HOST`
Location of the Redis server.
Defaults to `localhost`.

### `REDIS_PORT`
Redis server port.
Defaults to the Redis default of `6379`.

### `REDIS_PASSWORD`
Password used to connect to the Redis server.
Defaults to an empty string.

### `SCRUB`
Whether test databases should be dropped before running tests.
- `SCRUB=1`: Delete test databases (default)
- `SCRUB=0`: Don't delete test databases

The script that actually does the deletion work is `scripts/postgres-delete-test-databases.js`.

### `SERVER_HOST`
Location of the Jellyfish API server, defaults to `http://localhost`.

### `SERVER_PORT`
Jellyfish API server port, defaults to `8000`.
This is used in conjunction with `SERVER_HOST` to generate the full location of the API server, e.g. `http://localhost:8000`.

### `UI_HOST`
Location of the UI app, defaults to `http://localhost`.

### `UI_PORT`
UI app port, defaults to `9000`.
This is used with `UI_HOST` to generate the full location of the UI app, e.g. `http://localhost:9000`.

### `LIVECHAT_HOST`
Location of the Livechat app, defaults to `http://localhost`.

### `LIVECHAT_PORT`
Livechat app port, defaults to `9100`.
This is used with `LIVECHAT_HOST` to generate the full location of the Livechat app, e.g. `http://localhost:9100`.

### `INTEGRATION_*`
Any variables with names starting with `INTEGRATION_` are the keys/tokens/etc necessary for communicating with external service APIs, such as GitHub, Discourse, Front, Flowdock, Intercom, and the Balena API.

## Examples
Below are a number of `make test` command examples. They assume that some variables are already set as local environment variables.

It should be noted that in many cases the default values for the options set below are correct, meaning that they may be omitted when running `make test`. This is especially true for `SERVER_HOST`, `SERVER_PORT`, etc. when developing locally.

### Lint
Run lint checks:
```sh
$ make lint
```

### Unit
Run unit tests:
```sh
$ make test-unit
```

### Server Integration
Run server integration tests:
```sh
$ make test-integration-server
```

### E2E UI
Run UI e2e tests, passing along variables indicating where all necessary services are located:
```sh
sh make test-e2e-ui \
	SCRUB=0 \
	UI_HOST=http://ui \
	UI_PORT=80 \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### E2E Livechat
Run Livechat e2e tests, passing along variables indicating where all necessary services are located:
```sh
$ make test-e2e-livechat \
	SCRUB=0 \
	LIVECHAT_HOST=http://livechat \
	LIVECHAT_PORT=80 \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### E2E Server
Run server e2e tests, passing along some external service keys as well as where all necessary local services are located:
```sh
$ make test-e2e-server \
	SCRUB=0 \
	INTEGRATION_GITHUB_TOKEN=$GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$GITHUB_SIGNATURE_KEY \
	INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
	INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY=$FLOWDOCK_SIGNATURE_KEY \
	OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```
