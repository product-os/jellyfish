Working with the frontend
=========================

You can run any of the following commands instead of `make start-static` to get
a real-time frontend web development experience:

```sh
make dev-ui
make dev-chat-widget
make dev-storybook
```

You can run the UI relevant unit and end to end test suites as follows:

```sh
make test-unit-ui COVERAGE=0
make test-unit-ui-components COVERAGE=0
make build-ui test-e2e-ui COVERAGE=0 VISUAL=1
```

You can generate code coverage information from the end to end test suites as
follows:

```sh
make build-ui COVERAGE=1

# We need to create the bundle with coverage
# information but run the tests without it
make test-e2e-ui COVERAGE=0 VISUAL=1 # Visual mode opens Chromium while the tests run

make coverage
```

And open `coverage/index.html`.

You can run the unit and end to end SDK tests as follows:

```sh
make test-unit-sdk COVERAGE=0
make test-e2e-sdk COVERAGE=0
```
