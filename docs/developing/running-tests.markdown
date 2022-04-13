# Running tests

This document attempts to give an overview of the tests we currently have in Jellyfish and how they can be executed locally.

## Test Types
Jellyfish currently runs the following types of tests:
- Lint
- Unit
- E2E
- Integration

The source for all tests can be found under `tests/`, `apps/server/test`, and `apps/ui/lib/**/*.spec.ts`. Tests are primarily executed with `npm run` commands, see the examples below.

## Environment Variables
A number of environment variables are required for the system to function properly and, in some cases, for tests to run. Sane defaults are in place for development/testing in the [`@balena/jellyfish-environment`](https://github.com/product-os/jellyfish-environment) package. These defaults can be overridden by exporting values in your local shell, e.g. `$ export POSTGRES_HOST=localhost`. Also be sure and take a look through the [`@balena/jellyfish-environment`](https://github.com/product-os/jellyfish-environment) package's codebase to better understand what environment variables we use to run the system.

## Secrets
We provide secrets through git secrets under `.balena/secrets` that can be decrypted if you have access by executing `git secret reveal -f`. Contact someone on the Jellyfish team if you require access.

## Examples
Below are a number of command examples.

A number of tests require that multiple services be running and can talk to one another. The easiest to do this is with [Livepush](https://github.com/product-os/jellyfish#developing-with-livepush), but examples are also given for when Jellyfish is running locally. See the [local development guide](https://github.com/product-os/jellyfish/tree/master/docs/developing) for more on how to run Jellyfish locally. Also, if the output is a bit too noisy, try `LOGLEVEL=crit`.

### Lint
Run lint checks:
```sh
npm run lint
npm run lint:server
npm run lint:ui
```

### Unit
Run unit tests:
```sh
npm run test:unit
npm run test:unit:server
npm run test:unit:ui
```

### E2E SDK
Run SDK E2E tests:
```sh
UI_HOST=http://jel.ly.fish.local npm run test:e2e:sdk
UI_HOST=http://localhost UI_PORT=9000 npm run test:e2e:sdk
```

### E2E UI
Run UI E2E tests:
```sh
UI_HOST=http://jel.ly.fish.local npm run test:e2e:ui
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost UI_PORT=9000 npm run test:e2e:ui
```

Run UI E2E tests with browser displayed:
```sh
npx playwright install chromium
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost UI_PORT=9000 npx playwright test test/e2e/ui/index.spec.js --headed
```

### E2E Server
Run server E2E tests:
```sh
SERVER_HOST=http://api.ly.fish.local npm run test:e2e:server
SERVER_HOST=http://localhost SERVER_PORT=8000 npm run test:e2e:server
```

### Server Integration
Run server integration tests:
```sh
export INTEGRATION_BALENA_API_PRIVATE_KEY=$(cat .balena/secrets/integration_balena_api_private_key)
export INTEGRATION_BALENA_API_PUBLIC_KEY_PRODUCTION=$(cat .balena/secrets/integration_balena_api_public_key_production)
SERVER_PORT=8000 POSTGRES_HOST=postgres.ly.fish.local REDIS_HOST=redis.ly.fish.local npm run test:integration:server
SOCKET_METRICS_PORT=9009 SERVER_PORT=8009 POSTGRES_HOST=localhost REDIS_HOST=localhost npm run test:integration:server
```
