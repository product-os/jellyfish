Working with the frontend
=========================

You can run the following commands to get a real-time frontend web development experience.
Note that the frontend services require the backend service to be running to be of any use.

```sh
$ UI_PORT=9000 npm run dev:ui
$ LIVECHAT_PORT=9001 npm run dev:livechat
```

You can run the UI relevant unit and end to end test suites as follows:

```sh
$ cd apps/ui && npm run test
$ VISUAL=1 npm run test:e2e:ui
```

You can run the unit and end to end SDK tests as follows:

```sh
$ npm run test:e2e:sdk
```
