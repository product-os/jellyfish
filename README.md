<p align="center">
	<img src="./banner.png" height="160" />
</p>

Jellyfish is a social knowledge database that the team uses to collaborate,
without being blocked by departmental or hierarchal divisions. Jellyfish
gathers all information company wide and makes it a platform to implement
processes that enhance the team's productivity and understanding. Think of it
as a cross between Slack and Excel!

A "living specification" for the intended functioning of Jellyfish can be found [here](https://docs.google.com/document/d/1psa9upjr__LDbF0442ndW72Nj8jAuA48mmqPdahQBUs/edit?usp=sharing).
Many parts of Jellyfish are still under development, and this document aims to create a source of truth for how the platform *should* work, even if it doesn't represent the current functionality.

***

![Jellyfish Screenshot](./docs/assets/screenshot.png)

***

- **Contributing**
	- [**Design manifesto**](https://github.com/product-os/jellyfish/blob/master/docs/design-manifesto.markdown)
	- [**AutumnDB**](https://github.com/product-os/autumndb/blob/master/README.md) the low-level internal SDK to interact with contracts and links in the database
	- [**Plugin development**](https://github.com/product-os/jellyfish/blob/master/docs/developing/plugins.markdown)
	- [**Adding a new type**](https://github.com/product-os/jellyfish/blob/master/docs/developing/add-new-type.markdown)
	- [**Developing on balena**](https://github.com/product-os/jellyfish/blob/master/docs/developing/on-balena.markdown)
	- [**Running tests**](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests.markdown)
	- [**Adding metrics**](https://github.com/product-os/jellyfish-metrics/blob/master/doc/adding-metrics.markdown)
	- [**Managing secrets**](https://github.com/product-os/secrets)
- **Links**
	- [**Production logs**](https://monitor.balena-cloud.com/explore?left=%5B%22now-3h%22,%22now%22,%22loki%22,%7B%22expr%22:%22%22,%22datasource%22:%22loki%22,%22refId%22:%22A%22%7D%5D&orgId=1)
	- [**Metrics**](https://monitor.balena-cloud.com/dashboards/f/auto/auto)
- **Integrations**
	- [**Integrating with GitHub**](https://github.com/product-os/jellyfish/blob/master/docs/integrating-github.markdown)

## Install dependencies
If you want to develop Jellyfish on your local machine, you will need the following:

- Docker
- Docker Compose
- Node.js v16

Install node dependencies with:
```sh
npm run install:all
```

If you get a Playwright installation error, try skipping its browser downloads. [Source](https://github.com/microsoft/playwright/issues/1941#issuecomment-1008338376)
```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true npm run install:all
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

## Work with Dependencies
There are times in which you may want to make changes a dependency while working on a service component.
This is where `npm link` comes in. In the example below, we set up `@balena/jellyfish-metrics` as a dependency
using this strategy.

```bash
# If adding a new contract to the default plugin use
# export MODULE_NAME=jellyfish-plugin-default
export MODULE_NAME=jellyfish-metrics
# cd to your git clone root folder
cd ~/git
git clone git@github.com:product-os/$MODULE_NAME.git
cd $MODULE_NAME && npm i && npm run build && cd ..
git clone git@github.com:product-os/jellyfish.git
cd jellyfish && npm run install:all
sudo npm link ../$MODULE_NAME
cd apps/server
sudo npm link ../../../$MODULE_NAME
cd ../..
# check that the links were updated as expected
find . -name $MODULE_NAME
```

And the output will be similar to:
```
...
/usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
/home/$USER/git/jellyfish/node_modules/@balena/jellyfish-metrics -> /usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
```

Now any changes made in `~/git/jellyfish-metrics` will be reflected in `~/git/jellyfish/node_modules/@balena/jellyfish-metrics`.

To remove the global link:

```sh
cd ~/git/jellyfish-metrics
sudo npm uninstall
```

If you need to link another module you can use the following snippet, assuming you already have cloned and built the dependency:

```sh
export MODULE_NAME=jellyfish-plugin-default
cd jellyfish
sudo npm link ../$MODULE_NAME
cd apps/server
sudo npm link ../../../$MODULE_NAME
cd ../..
# check that the links were updated as expected
find . -name $MODULE_NAME
```

`npm link` uses the global `node_modules` directory for linking, which is usually in a path not owned by a normal user, making it necessary to run with `sudo`.
A way around this is to configure `npm` to use a directory the current user is the owner of:
```sh
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

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

## Reporting problems

If you're having any problems, please [raise an issue](https://github.com/product-os/jellyfish/issues/new) on GitHub and the Jellyfish team will be happy to help.

## License

Jellyfish is open-source software. See the LICENSE file for more information.
