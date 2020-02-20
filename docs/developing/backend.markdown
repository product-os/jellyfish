# Working with the backend

- [Working with the backend](#working-with-the-backend)
	- [Profiling](#profiling)
	- [Share API over the Network](#share-api-over-the-network)
	- [ndb](#ndb)
	- [@ffissore's collection of docker & k8s scripts](#ffissores-collection-of-docker--k8s-scripts)

## Profiling
You can run any of the backend components in profile mode using `NODE_ENV`, for
example:

> Install `0x` using `npm install --global 0x` if you haven't already

```sh
make start-worker NODE_ENV=profile
```

Once you are done, kill the process using i.e. `Ctrl-C`, and you will get an
interactive flamegraph in your browser:

![0x Flamegraph](../assets/0x-flamegraph.png)

You can filter down the types of logs that get printed to standard output using
`LOGLEVEL`. For example:

```sh
make start-server LOGLEVEL=warn
```

## Share API over the Network
You can share your local API instance over the network using `ngrok`:

```sh
make ngrok-server
```

## [ndb](https://github.com/GoogleChromeLabs/ndb)
> ndb is an improved debugging experience for Node.js, enabled by Chrome DevTools
Lucian found ndb to be really useful for debugging backend code. It allows you to easily start a Chrome DevTools windows connected to your Node.js application.

## [@ffissore's collection of docker & k8s scripts](https://github.com/ffissore/docker-k8s-scripts)
>  A collection of scripts that ease daily docker and kubernetes usage.
