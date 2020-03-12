Working with the frontend
=========================

You can run any of the following commands instead of `make start-static` to get
a real-time frontend web development experience:

```sh
make dev-ui
make dev-chat-widget
```

You can run the UI relevant unit and end to end test suites as follows:

```sh
make test-unit-ui
make test-unit-ui-components
make build-ui test-e2e-ui VISUAL=1
```

You can run the unit and end to end client SDK tests as follows:

```sh
make test-unit-client-sdk
make test-e2e-client-sdk
```
