<p align="center">
	<img src="./banner.png" height="160" />
</p>

Jellyfish is a social knowledge database that the team uses to collaborate,
without being blocked by departmental or hierarchal divisions. Jellyfish
gathers all information company wide and makes it a platform to implement
processes that enhance the team's productivity and understanding. Think of it
as a cross between Slack and Excel!

***

- **Contributing**
	- [**Architecture overview**](https://github.com/balena-io/jellyfish/blob/master/ARCHITECTURE.md)
	- [**Working with the frontend**](https://github.com/balena-io/jellyfish/blob/master/docs/developing/frontend.markdown)
	- [**Working with the backend**](https://github.com/balena-io/jellyfish/blob/master/docs/developing/backend.markdown)
- **Services**
	- [**Using New Relic**](https://github.com/balena-io/jellyfish/blob/master/docs/newrelic.markdown)
	- [**Using Balena CI**](https://github.com/balena-io/jellyfish/blob/master/docs/balenaci.markdown)
	- [**Using Sentry**](https://github.com/balena-io/jellyfish/blob/master/docs/sentry.markdown)

Running with Katapult
---------------------

TODO

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
make build-ui start-static-ui COVERAGE=0
```

The API will listen on `8000` and the UI will listen on `9000`. Open
http://localhost:9000 and login as:

- Username: `jellyfish`
- Password: `jellyfish`

> Note: The development user is not available in production
> (`NODE_ENV=production`)

Testing
-------

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

The tests run with code coverage instrumentation by default unless you pass
`COVERAGE=0`. The tests don't generate a coverage report until you run `make
coverage`, which will accumulate all the code coverage information stored until
that point from `.nyc_output`.

Some suites may provide or require various options. Consult the corresponding
["Developing"
guides](https://github.com/balena-io/jellyfish/tree/master/docs/developing) or
the [`Makefile`](https://github.com/balena-io/jellyfish/blob/master/Makefile)
if unsure.

Reporting problems
------------------

If you're having any problem, please [raise an
issue](https://github.com/balena-io/jellyfish/issues/new) on GitHub and the
Jellyfish team will be happy to help.

License
-------

Jellyfish is propietary software. Unauthorized distribution of any files in
this repository via any medium is strictly prohibited.
