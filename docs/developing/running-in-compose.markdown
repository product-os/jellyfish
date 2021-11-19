# Running in compose

This is the easiest way to run Jellyfish locally given you have [`docker-compose`](https://docs.docker.com/compose/) installed.

First build all of the containers:
```sh
$ make compose-build
```

Start the cluster with:
```sh
$ make compose-up
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
```sh
$ MONITOR=1 make compose-build
$ MONITOR=1 make compose-up
```

Prometheus can be accessed at `http://localhost:9090`.
Grafana is available at `http://localhost:3000` with the Jellyfish graphs located under the `standard` folder.

You can also include the `sut` container with `SUT=1`:
```sh
$ SUT=1 make compose-build
$ SUT=1 make compose-up
```

The `sut` container is used to execute CI tests/tasks. Read [this doc](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests-in-compose.markdown) for more on how to run these tests/tasks in a local `docker-compose` cluster.
