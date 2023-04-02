## Install dependencies
If you want to develop Jellyfish on your local machine, you will need the following:

- Docker
- Docker Compose
- Node.js v16

Install node dependencies with:
```sh
npm run install:all
```

## Start services
You can then run these commands in different terminal emulators, which will run all services in non-daemon mode:

Start Postgres, Redis, and MinIO services:
```sh
npm run compose:local
```

Start the frontend:
```sh
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_PORT=9000 npm run dev:ui
```

Start the backend:
```sh
MAX_WORKERS=1 SERVER_HOST=http://localhost SERVER_PORT=8000 POSTGRES_HOST=localhost REDIS_HOST=localhost \
    AWS_S3_ENDPOINT=http://localhost:43680 AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY AWS_S3_BUCKET_NAME=jellyfish npm run dev:server
```

The API will listen on `8000` and the UI will listen on `9000`. Open http://localhost:9000 and login with:
- Username: `jellyfish`
- Password: `jellyfish`

> Note: The development user is not available in production
> (`NODE_ENV=production`)

You can also view uploaded files by opening http://localhost:43697 and logging in with:
- Username: `AKIAIOSFODNN7EXAMPLE`
- Password: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

## Run tests
Below are a number of test execution examples.

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
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost UI_PORT=9000 npm run test:e2e:sdk
```

### E2E UI
Install browser for tests:
```sh
npx playwright install chromium
```

Run UI E2E tests with headless browser:
```sh
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost:9000 npm run test:e2e:ui
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost:9000 npx playwright test test/e2e/ui/index.spec.js
```

Run UI E2E tests with browser displayed:
```sh
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_HOST=http://localhost:9000 npx playwright test test/e2e/ui/index.spec.js --headed
```

### E2E Server
Run server E2E tests:
```sh
SERVER_HOST=http://localhost SERVER_PORT=8000 npm run test:e2e:server
```

### Server Integration
Run server integration tests:
```sh
SOCKET_METRICS_PORT=9009 SERVER_PORT=8009 POSTGRES_HOST=localhost REDIS_HOST=localhost npm run test:integration:server
```
