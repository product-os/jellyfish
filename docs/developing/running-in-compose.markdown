# Running in compose

This is the easiest way to run Jellyfish locally given you have [`docker-compose`](https://docs.docker.com/compose/) installed.

Build and run the cluster with:
```sh
$ npm run compose:build
$ npm run compose:up
```

Add endpoints to local hosts file:
```
127.0.0.1 livechat.ly.fish.local api.ly.fish.local jel.ly.fish.local redis.ly.fish.local postgres.ly.fish.local grafana.ly.fish.local prometheus.ly.fish.local
```

The API will listen on `http://api.ly.fish.local:80` and the UI will listen on `http://jel.ly.fish.local:80`.
Open `http://jel.ly.fish.local` and log in with:

- Username: `jellyfish`
- Password: `jellyfish`

Prometheus can be accessed at `http://prometheus.ly.fish.local:9090`.
Grafana is available at `http://grafana.ly.fish.local:3000` with the Jellyfish graphs located under the `standard` folder.

You can also run the cluster with the test runner container used in CI:
```sh
$ npm run compose:test
```

The `sut` container is used to execute CI tests/tasks. Read [this doc](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests-in-compose.markdown) for more on how to run these tests/tasks in a local `docker-compose` cluster.
