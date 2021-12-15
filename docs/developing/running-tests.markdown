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

### Lint
Run lint checks:
```sh
$ make lint
```

### Unit
Run unit tests:
```sh
$ cd apps/server && npm run test:unit
$ cd apps/ui && npm run test:unit
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
