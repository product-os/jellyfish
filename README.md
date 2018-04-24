Jellyfish
=========

[![CircleCI](https://circleci.com/gh/resin-io/jellyfish/tree/master.svg?style=svg&circle-token=a2fd174edea733705e39a120177472b9c949cc5b)](https://circleci.com/gh/resin-io/jellyfish/tree/master)

Installing RethinkDB
--------------------

- On macOS, run `brew install rethinkdb`

RethinkDB Setup
---------------

1. Create a user in the `users` table of the special `rethinkdb` database. In
   this case we will call it `master`:

    ```js
    r.db('rethinkdb').table('users').insert({
      id: 'master',
      password: 'secretpassword'
    })
    ```

2. Create a database called `jellyfish`:

    ```js
    r.dbCreate('jellyfish')
    ```

2. Grant the user created before read, write, and config access over the
   `jellyfish` database:

    ```js
    r.db('jellyfish').grant('jellyfish', {
      read: true,
      write: true,
      config: true
    })
    ```

Running in testing mode
-----------------------

Run the `rethinkdb` binary on a separate terminal, and then run `npm start`
without any special environment variables.

Running in production mode
--------------------------

Set the following environment variables:

```
NODE_ENV=production
DB_HOST=<database host>
DB_PORT=<database port>
DB_USER=<database user as created before>
DB_PASSWORD=<database user password>
DB_CERT=<database SSL certificate>
```

And then run:

```sh
npm start
```

/lib/sync
==

A tool for pushing Flowdock threads to Jellyfish.  Done as a jumping off point
for SyncBot development.

1) Get your [flowdock token](https://www.flowdock.com/account/tokens)
2) Run `./lib/sync/sync.sh` with your token as the first argument
