# Running in compose

This is the easiest way to run Jellyfish locally given you have [`docker-compose`](https://docs.docker.com/compose/) installed.

Add/updated endpoints in your local hosts file:
```
127.0.0.1 livechat.ly.fish.local api.ly.fish.local jel.ly.fish.local postgres.ly.fish.local redis.ly.fish.local grafana.ly.fish.local prometheus.ly.fish.local s3.ly.fish.local
```

Then build and run the cluster with:
```sh
docker-compose up --build
```

Once the system is up and running, you can follow the same instructions for logging in,
working with metrics/storage, etc. that are described in the main readme.

You can also run the cluster with the test runner container used in CI:
```sh
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

The `sut` container is used to execute CI tests/tasks. Read [this doc](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests-in-compose.markdown) for more on how to run these tests/tasks in a local `docker-compose` cluster.
