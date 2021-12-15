# Developing locally

If you want to develop Jellyfish on your local machine, the pre-requisites are:

- Docker
- Docker Compose
- Node.js

Install the dependencies:

```sh
$ npm i
```

You can then run these commands in different terminal emulators, which will run
all services in non-daemon mode:

```sh
$ npm run compose:database
$ SERVER_HOST=http://localhost SERVER_PORT=8000 UI_PORT=9000 npm run dev:ui
$ SERVER_HOST=http://localhost SERVER_PORT=8000 LIVECHAT_PORT=8001 npm run dev:livechat
$ SERVER_HOST=http://localhost SERVER_PORT=8000 POSTGRES_HOST=localhost REDIS_HOST=localhost npm run dev:server
```

The API will listen on `8000` and the UI will listen on `9000`. Open
http://localhost:9000 and login as:

- Username: `jellyfish`
- Password: `jellyfish`

> Note: The development user is not available in production
> (`NODE_ENV=production`)

## Working with Dependencies

There are times in which you may want to make changes a dependency while working on a service component.
This is where `npm link` comes in. In the example below, we set up `@balena/jellyfish-metrics` as a dependency
using this strategy.
```
$ cd ~/git
$ git clone git@github.com:product-os/jellyfish-metrics.git
$ cd jellyfish-metrics && npm i && cd ..
$ git clone git@github.com:product-os/jellyfish.git
$ cd jellyfish && npm i
$ sudo npm link ../jellyfish-metrics
...
/usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
/home/josh/git/jellyfish/node_modules/@balena/jellyfish-metrics -> /usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
```

Now any changes made in `~/git/jellyfish-metrics` will be reflected in `~/git/jellyfish/node_modules/@balena/jellyfish-metrics`.

To remove the global link:
```
$ cd ~/git/jellyfish-metrics
$ sudo npm uninstall
```

`npm link` uses the global `node_modules` directory for linking, which is usually in a path not owned by a normal user, making it necessary to run with `sudo`.
A way around this is to configure `npm` to use a directory the current user is the owner of:
```
$ mkdir ~/.npm-global
$ npm config set prefix '~/.npm-global'
$ export PATH=~/.npm-global/bin:$PATH
```
