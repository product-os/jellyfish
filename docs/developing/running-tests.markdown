# Running tests

This document attempts to give an overview of the tests we currently have in Jellyfish and how they can be executed locally.

## Test Types
Jellyfish currently runs the following types of tests:
- Lint
- Unit
- E2E
- Integration

The source for all tests can be found under `tests/` and are executed primarily with `npm run` commands. Examples can be found at the bottom of this document.

## Environment Variables
A number of environment variables are required for the system to function properly and, in some cases, for tests to run. Sane defaults are in place for development/testing in the [`@balena/jellyfish-environment`](https://github.com/product-os/jellyfish-environment) package. These defaults can be overridden by exporting values in your local shell, e.g. `$ export POSTGRES_HOST=localhost`. Also be sure and take a look through the [`@balena/jellyfish-environment`](https://github.com/product-os/jellyfish-environment) package's codebase to better understand what environment variables we use to run the system.

## Secrets
We provide secrets through git secrets under `.balena/secrets` that can be decrypted if you have access by executing `git secret reveal -f`. Contact someone on the Jellyfish team if you require access.

## Examples
Below are a number of command examples.

### Lint
Run lint checks:
```sh
$ npm run lint
$ npm run lint:livechat
$ npm run lint:server
$ npm run lint:ui
```

### Unit
Run unit tests:
```sh
$ npm run test:unit
$ npm run test:unit:server
$ npm run test:unit:ui
```

### Server Integration
Run server integration tests:
```sh
$ npm run test:integration:server
```

These tests assume that the following services are running and can talk to one another - the `apps/server` service, a Postgres service, and a Redis service. You may need to override some environment variables when executing locally, for example:
```sh
$ npm run compose:database
$ POSTGRES_HOST=localhost REDIS_HOST=localhost npm run test:integration:server
```

### E2E UI
Run UI E2E tests.
```sh
$ npm run test:e2e:ui
```

These tests assume that the following services are running and can talk to one another - the `apps/ui` service, the `apps/server` service, a Postgres service, and Redis service. You may need to override the following environment variables when executing locally, for example:
```sh
$ npm run compose:database
$ POSTGRES_HOST=localhost REDIS_HOST=localhost SERVER_HOST=http://localhost SERVER_PORT=8000 npm run dev:server
$ SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost UI_PORT=9000 npm run dev:ui
$ SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost UI_PORT=9000  npm run test:e2e:ui
```

### E2E Livechat
Run Livechat E2E tests.
```sh
$ npm run test:e2e:livechat
```

These tests assume that the following services are running and can talk to one another - the `apps/livechat` service, the `apps/server` service, a Postgres service, and Redis service. You may need to override the following environment variables when executing locally, for example:
```sh
$ npm run compose:database
$ POSTGRES_HOST=localhost REDIS_HOST=localhost SERVER_HOST=http://localhost SERVER_PORT=8000 npm run dev:server
$ SERVER_HOST=http://localhost SERVER_PORT=8000 LIVECHAT_HOST=http://localhost LIVECHAT_PORT=9000 npm run dev:livechat
$ SERVER_HOST=http://localhost SERVER_PORT=8000 LIVECHAT_HOST=http://localhost LIVECHAT_PORT=9000 npm run test:e2e:livechat
```

### E2E Server
Run server E2E tests.
```sh
$ npm run test:e2e:server
```

These tests assume that the following services are running and can talk to one another - the `apps/server` service, a Postgres service, and a Redis service. You may need to override some environment variables when executing locally, for example:
```sh
$ npm run compose:database
$ POSTGRES_HOST=localhost REDIS_HOST=localhost SERVER_HOST=http://localhost SERVER_PORT=8000 npm run dev:server
$ POSTGRES_HOST=localhost REDIS_HOST=localhost npm run test:e2e:server
```
