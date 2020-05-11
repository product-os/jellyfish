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

You can run the unit and end to end SDK tests as follows:

```sh
make test-unit-sdk
make test-e2e-sdk
```

### Service Worker

Jellyfish is a Progressive Web App which makes use of a service worker.

The environment variables `NODE_ENV` and `JF_DEBUG_SW` determine whether the service worker is registered on startup and whether it outputs dev logs. The following table summarises the behaviour:

|                                       | `NODE_ENV === 'production'` | `NODE_ENV !== 'production'` |
|---------------------------|----------------------------------|---------------------------------|
| `JF_DEBUG_SW === '1'`    | Service worker is registered<br>Workbox logs are disabled | Service worker is registered<br>Workbox logs are enabled |
| `JF_DEBUG_SW !== '1'` |  Service worker is registered<br>Workbox logs are disabled | Service worker is not registered<br>Workbox logs are disabled |

In summary: if you are debugging, first clear your application cache and then ensure the `JF_DEBUG_SW` environment variable is unset. Run `make dev-ui` and the service worker will not be used.

If you specifically _want_ to debug the service worker, use the following approach:
```
JF_DEBUG_SW=1 make build-ui
make start-static-ui
```

