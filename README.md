<p align="center">
	<img src="./banner.png" height="160" />
</p>

Jellyfish is a social knowledge database that the team uses to collaborate,
without being blocked by departmental or hierarchal divisions. Jellyfish
gathers all information company wide and makes it a platform to implement
processes that enhance the team's productivity and understanding. Think of it
as a cross between Slack and Excel!

***

![Jellyfish Screenshot](./screenshot.png)

***

- **Contributing**
	- [**Architecture overview**](https://github.com/product-os/jellyfish/blob/master/ARCHITECTURE.md)
	- [**Working with the frontend**](https://github.com/product-os/jellyfish/blob/master/docs/developing/frontend.markdown)
	- [**Working with the backend**](https://github.com/product-os/jellyfish/blob/master/docs/developing/backend.markdown)
	- [**Adding a new type**](https://github.com/product-os/jellyfish/blob/master/docs/developing/add-new-type.markdown)
	- [**Developing locally**](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-on-balena.markdown)
	- [**Adding metrics**](https://github.com/product-os/jellyfish/blob/master/docs/developing/adding-metrics.markdown)
- **Links**
	- [**Rapid7**](https://eu.ops.insight.rapid7.com/op/8306227C3C134F65ACF1#/search?logs=%5B%225df30105-2e0a-4e5a-b76a-baa5fc997b36%22%5D&range=Last%2020%20Minutes)
	- [**Sentry**](https://sentry.io/organizations/balena/issues/?project=1366139)
	- [**New Relic**](https://synthetics.newrelic.com/accounts/2054842/monitors/8bf2b38d-7c2a-4d71-9629-7cbf05b6bd21)
	- [**Metrics**](https://monitor.balena-cloud.com/d/jellyfish/jellyfish?orgId=1)
- **Services**
	- [**Using New Relic**](https://github.com/product-os/jellyfish/blob/master/docs/newrelic.markdown)
	- [**Using Balena CI**](https://github.com/product-os/jellyfish/blob/master/docs/balenaci.markdown)
	- [**Using Sentry**](https://github.com/product-os/jellyfish/blob/master/docs/sentry.markdown)

Getting private package access
------------------------------

In order to develop Jellyfish, you must have an [npmjs](https://npmjs.com) account
that has read access to the private Jellyfish packages. Provide your npmjs account
information with ops and request access. Once access has been granted, you will now
be able to build and run Jellyfish by setting the `NPM_TOKEN` environment variable:

```sh
npm login
export NPM_TOKEN=`cat ~/.npmrc | cut -d '=' -f 2`
```

Running with Docker Compose
---------------------------

This is the easiest way to run Jellyfish locally given you have [Docker
Compose](https://docs.docker.com/compose/) installed. First build all the
containers:

```sh
npm install
make compose-build
```

Run them with:

```sh
make compose-up
```

Add endpoints to local hosts file:

```
127.0.0.1 livechat.ly.fish.local api.ly.fish.local jel.ly.fish.local
```

The API will listen on `http://api.ly.fish.local:80` and the UI will listen on `http://jel.ly.fish.local:80`.
Open `http://jel.ly.fish.local` and login as:

- Username: `jellyfish`
- Password: `jellyfish`

To include instances of Prometheus and Grafana, build and start your cluster with `MONITOR=1`:
```
make compose-build MONITOR=1
make compose-up MONITOR=1
```

Prometheus can be accessed at `http://localhost:9090`.
Grafana is available at `http://localhost:3000` with the Jellyfish graphs located under the `standard` folder.

Running natively
----------------

If you want to run Jellyfish natively, the pre-requisites are:

- Redis (`brew install redis` on macOS)
- PostgreSQL (`brew install postgresql` on macOS)
- Node.js
- Python 2

Install the dependencies:

```sh
npm install
```

You can then run these commands in different terminal emulators, which will run
all services in non-daemon mode:

```sh
make start-postgres
make start-redis
make start-server
make start-tick
make start-worker # Run more than once for more workers
make build-ui start-static-ui
```

The API will listen on `8000` and the UI will listen on `9000`. Open
http://localhost:9000 and login as:

- Username: `jellyfish`
- Password: `jellyfish`

> Note: The development user is not available in production
> (`NODE_ENV=production`)

Testing
-------

>Note: the `make lint` script has a dependency on [shellcheck](https://github.com/koalaman/shellcheck) which must
>be installed first.

You can run the linter like this:

```sh
make lint
make lint FIX=1 # Optionally try to fix some of the linting issues
```

The tests live in `test/<type>/<component>/**/*.spec.js`, where `type` is
`unit`, `integration`, or `e2e` and `component` corresponds to any of the
directories inside `lib` or `apps`. As an exception to the rule, the frontend
components store their unit tests along with the production code (company
policy).

We provide GNU Make utility rules to run different test suites, for example:

```sh
make test-integration-queue                      # Run all the queue integration tests
make test-e2e-server                             # Run all the server end to end tests
make test-e2e                                    # Run all the end to end tests
make test FILES=./test/unit/worker/utils.spec.js # Run a specific unit test file inside "worker"
```

Some suites may provide or require various options. Consult the corresponding
["Developing"
guides](https://github.com/product-os/jellyfish/tree/master/docs/developing) or
the [`Makefile`](https://github.com/product-os/jellyfish/blob/master/Makefile)
if unsure.

Reporting problems
------------------

If you're having any problem, please [raise an
issue](https://github.com/product-os/jellyfish/issues/new) on GitHub and the
Jellyfish team will be happy to help.

License
-------

Jellyfish is propietary software. Unauthorized distribution of any files in
this repository via any medium is strictly prohibited.
