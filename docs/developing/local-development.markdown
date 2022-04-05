# Developing locally

If you want to develop Jellyfish on your local machine, the pre-requisites are:

- Docker
- Docker Compose
- Node.js v16

Install the dependencies:

```sh
npm i
```

You can then run these commands in different terminal emulators, which will run
all services in non-daemon mode:

```sh
npm run compose:database
SERVER_HOST=http://localhost SERVER_PORT=8000 UI_PORT=9000 npm run dev:ui
SERVER_HOST=http://localhost SERVER_PORT=8000 POSTGRES_HOST=localhost REDIS_HOST=localhost npm run dev:server
```

The API will listen on `8000` and the UI will listen on `9000`. Open [http://localhost:9000](http://localhost:9000) and login as:

- Username: `jellyfish`
- Password: `jellyfish`

> Note: The development user is not available in production
> (`NODE_ENV=production`)

## Working with Dependencies

There are times in which you may want to make changes a dependency while working on a service component.
This is where `npm link` comes in. In the example below, we set up `@balena/jellyfish-metrics` as a dependency
using this strategy.

```bash
# If adding a new contract to the default plugin use
# export MODULE_NAME=jellyfish-plugin-default
export MODULE_NAME=jellyfish-metrics
# cd to your git clone root folder
cd ~/git
git clone git@github.com:product-os/$MODULE_NAME.git
cd $MODULE_NAME && npm i && npm run build && cd ..
git clone git@github.com:product-os/jellyfish.git
cd jellyfish && npm i
sudo npm link ../$MODULE_NAME
cd apps/server
sudo npm link ../../../$MODULE_NAME
cd ../..
# check that the links were updated as expected
find . -name $MODULE_NAME
```

And the output will be similar to:

```
...
/usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
/home/$USER/git/jellyfish/node_modules/@balena/jellyfish-metrics -> /usr/lib/node_modules/@balena/jellyfish-metrics -> /home/josh/git/jellyfish-metrics
```

Now any changes made in `~/git/jellyfish-metrics` will be reflected in `~/git/jellyfish/node_modules/@balena/jellyfish-metrics`.

To remove the global link:

```sh
cd ~/git/jellyfish-metrics
sudo npm uninstall
```

If you need to link another module you can use the following snippet, assuming you already have cloned and built the dependency:

```sh
export MODULE_NAME=jellyfish-plugin-default
cd jellyfish
sudo npm link ../$MODULE_NAME
cd apps/server
sudo npm link ../../../$MODULE_NAME
cd ../..
# check that the links were updated as expected
find . -name $MODULE_NAME
```

`npm link` uses the global `node_modules` directory for linking, which is usually in a path not owned by a normal user, making it necessary to run with `sudo`.
A way around this is to configure `npm` to use a directory the current user is the owner of:

```sh
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```
