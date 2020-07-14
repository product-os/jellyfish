# Working with Dependencies

There are times in which you may want to make changes a dependency while working on a service component.
This is where `npm link` comes in. In the example below, we set up `@balena/jellyfish-metrics` as a dependency using this strategy.
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
