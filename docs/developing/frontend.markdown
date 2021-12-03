Working with the frontend
=========================

You can run the following commands to get a real-time frontend web development experience:

```sh
make dev-ui
make dev-livechat
```

You can run the UI relevant unit and end to end test suites as follows:

```sh
cd apps/ui && npm run test
make build-ui test-e2e-ui VISUAL=1
```

You can run the unit and end to end SDK tests as follows:

```sh
npm run test:e2e:sdk
```
