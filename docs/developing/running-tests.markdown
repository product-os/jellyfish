# Running Tests

This document attempts to give an overview of the tests we currently have in Jellyfish and how they can be executed.

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
Run ESLint tests:
```
npm test
```

### Unit
Run unit tests:
```
make test-unit
```

### Front Mirror
Run Front mirror tests with proper keys and tokens set:
```
make test \
	FILES=./test/e2e/sync/front-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_FRONT_TOKEN=$FRONT_TOKEN \
	INTEGRATION_INTERCOM_TOKEN=$INTERCOM_TOKEN \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and token set (cases requiring them should get skipped):
```
make test \
	FILES=./test/e2e/sync/front-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_FRONT_TOKEN= \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### Front Translate
Run Front translate tests with proper keys and token set:
```
make test \
	FILES=./test/integration/sync/front-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_FRONT_TOKEN=$FRONT_TOKEN \
	INTEGRATION_INTERCOM_TOKEN=$INTERCOM_TOKEN \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/front-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_FRONT_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### Discourse Mirror
Run Discourse mirror tests with proper keys and tokens set:
```
make test \
	FILES=./test/e2e/sync/discourse-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN=$DISCOURSE_TOKEN \
	INTEGRATION_DISCOURSE_SIGNATURE_KEY=$DISCOURSE_SIGNATURE_KEY \
	INTEGRATION_DISCOURSE_USERNAME=$DISCOURSE_USERNAME \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/e2e/sync/discourse-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### Discourse Translate
Run Discourse translate tests with proper keys and tokens set:
```
make test \
	FILES=./test/integration/sync/discourse-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN=$DISCOURSE_TOKEN \
	INTEGRATION_DISCOURSE_SIGNATURE_KEY=$DISCOURSE_SIGNATURE_KEY \
	INTEGRATION_DISCOURSE_USERNAME=$DISCOURSE_USERNAME \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/discourse-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_DISCOURSE_TOKEN= \
	SERVER_HOST=http://api \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### Outreach Mirror
Run Outreach mirror tests with proper keys and tokens set.
```
make test \
	FILES=./test/integration/server/outreach-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
	INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
	SERVER_HOST=http://localhost \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE \
	REDIS_HOST=localhost
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/server/outreach-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_OUTREACH_APP_ID= \
	INTEGRATION_OUTREACH_APP_SECRET= \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=
```

### Outreach Translate
Run Outreach translate tests with proper keys and tokens set:
```
make test \
	FILES=./test/integration/sync/outreach-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
	INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/outreach-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_OUTREACH_APP_ID= \
	INTEGRATION_OUTREACH_APP_SECRET= \
	INTEGRATION_OUTREACH_SIGNATURE_KEY=
```

### Balena API Translate
Run Balena API translate tests with proper keys and tokens set:
```
make test \
	FILES=./test/integration/sync/balena-api-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION=$BALENA_API_PUBLIC_KEY_PRODUCTION \
	INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING=$BALENA_API_PUBLIC_KEY_STAGING \
	INTEGRATION_BALENA_API_PRIVATE_KEY=$BALENA_API_PRIVATE_KEY
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/balena-api-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION= \
	INTEGRATION_BALENA_API_PUBLIC_KEY_STAGING= \
	INTEGRATION_BALENA_API_PRIVATE_KEY=
```

### GitHub Mirror
Run GitHub mirror tests with proper keys and tokens set:
```
make test \
	FILES=./test/e2e/sync/github-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_GITHUB_TOKEN=$GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$GITHUB_SIGNATURE_KEY \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/e2e/sync/github-mirror.spec.js \
	SCRUB=0 \
	INTEGRATION_GITHUB_TOKEN= \
	SERVER_HOST=http://api \
	SERVER_PORT=8000 \
	POSTGRES_HOST=$POSTGRES_HOST \
	POSTGRES_USER=$POSTGRES_USER \
	POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
	POSTGRES_DATABASE=$POSTGRES_DATABASE
```

### GitHub Translate
Run GitHub translate tests with proper keys and tokens set:
```
make test \
	FILES=./test/integration/sync/github-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_GITHUB_TOKEN=$GITHUB_TOKEN \
	INTEGRATION_GITHUB_SIGNATURE_KEY=$GITHUB_SIGNATURE_KEY
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/github-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_GITHUB_TOKEN=
```

### Flowdock Translate
Run Flowdock translate tests with proper keys and tokens set:
```
make test \
	FILES=./test/integration/sync/flowdock-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY=$FLOWDOCK_SIGNATURE_KEY \
	INTEGRATION_FLOWDOCK_TOKEN=$FLOWDOCK_TOKEN
```

Run the same tests without keys and tokens set (cases requiring them should get skipped):
```
make test \
	FILES=./test/integration/sync/flowdock-translate.spec.js \
	SCRUB=0 \
	INTEGRATION_FLOWDOCK_SIGNATURE_KEY= \
	INTEGRATION_FLOWDOCK_TOKEN=
```

### E2E UI
Run UI e2e tests, passing along variables indicating where all necessary services are located:
```
make test-e2e-ui \
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
```
make test-e2e-livechat \
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
```
make test-e2e-server \
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

### Multiple Integration Tests
Run multiple integration tests with two `make test` commands. Note that as some external service tokens/keys are not passed as variables in this example, not all tests will run. For example, since `INTEGRATION_FRONT_TOKEN` is not set, the Front sync tests will get skipped.
```
make test-integration-core test-integration-queue test-integration-sync test-integration-worker SCRUB=0 && \
	make test-integration-server \
		SCRUB=0 \
		INTEGRATION_OUTREACH_APP_ID=$OUTREACH_APP_ID \
		INTEGRATION_OUTREACH_APP_SECRET=$OUTREACH_APP_SECRET \
		INTEGRATION_OUTREACH_SIGNATURE_KEY=$OUTREACH_SIGNATURE_KEY \
		OAUTH_REDIRECT_BASE_URL=https://jel.ly.fish \
		SERVER_HOST=http://localhost \
		SERVER_PORT=8000 \
		POSTGRES_HOST=$POSTGRES_HOST \
		POSTGRES_USER=$POSTGRES_USER \
		POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
		POSTGRES_DATABASE=$POSTGRES_DATABASE \
		REDIS_HOST=localhost
```

Please note that when running `test-integration-worker` and `test-integration-server` against an instance of Jellyfish running natively on your local machine, you will need to override default ports or tests will fail as necessary API/worker bootstraps will fail.
```
METRICS_PORT=9400 make test-integration-worker
METRICS_PORT=9400 SOCKET_METRICS_PORT=9500 SERVER_PORT=8100 make test-integration-server
```
