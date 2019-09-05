Working with the backend
========================

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

You can share your local API instance over the network using `ngrok`:

```sh
make ngrok-server
```
