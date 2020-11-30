# Running in Docker Compose

This is the easiest way to run Jellyfish locally given you have [Docker
Compose](https://docs.docker.com/compose/) installed. First build all the
containers:

```sh
export NPM_TOKEN=xxxxx
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
