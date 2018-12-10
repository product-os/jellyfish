Jellyfish
=========

[![CircleCI](https://circleci.com/gh/resin-io/jellyfish/tree/master.svg?style=svg&circle-token=a2fd174edea733705e39a120177472b9c949cc5b)](https://circleci.com/gh/resin-io/jellyfish/tree/master)

API Docs
--------

Visit https://balena-jellyfish.herokuapp.com/docs.html. Install `redoc-cli` if
you want to locally re-generate them.

Maxims
------

This is a collection of thoughts to help guide Jellyfish development, and
prevent us from failling into traps, usually obtained after long conversations
and previously made mistakes. Most of the credit goes to Alexandros Marinos :)

- No data should be siloed
- Allow inter-work between human and machine
- Structure information first, and then people around that, not the other way
	around
- Keep barriers for modification low
- The system should remain fluid enough to transform significantly in the
	future if needed
- Avoid things that limit our solution space in the future and closes our doors
- Remove barriers between developers and users. Users should be empowered to
	mutate the system
- The system should allow evolving both the content and the structure of the
	data

What do we want to solve?
-------------------------

- The people at the front-line have all the data, but most businesses don't
	collect that data up
- The system should become the backbone of a distributed team that can
	scallably grow organically and faster in an scalable way, and do so well. The
	system will give us the ability to keep growing while not dropping the
	quality

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
INTEGRATION_GITHUB_TOKEN=<github token>
INTEGRATION_FRONT_TOKEN=<front token>
```

And then run:

```sh
npm start
```

If you would like to have errors reported to sentry, you can provide a sentry
DSN using the environment variable `SENTRY_DSN_SERVER` for server errors and
`SENTRY_DSN_UI` for UI errors.

Developing the UI
-----------------

The UI can be started in development mode using the command:

```
make dev-ui
```

You can access the UI at http://localhost:9000
Any changes made to the UI or SDK source code will trigger an automatic reload
of the UI.
By default the UI will try to access the API at http://localhost:8000 but this
can be changed using the `API_URL` environment variable.

e2e Tests
---------

To run UI end-to-end tests you need to set the following environment variables

```
JF_URL=<the url of the Jellyfish instance to test>
JF_TEST_USER=<the username of the test user>
JF_TEST_PASSWORD=<the password for the test user>
```

Run the tests using the command

```sh
npm run test:e2e
```

Puppeteer
---------

UI Integration tests use puppeteer to simulate a browser. If you set the
environement variable `PUPPETEER_VISUAL_MODE=1`, Puppeteer will launch
a browser so you can see the test running.

File uploads
------------

By default uploaded files are saved to the local disk in a directory named
`jellyfish-files`. You can also use AWS S3 to store files: to do this, you need
to set the following environment variables:

```
FS_DRIVER=s3FS
AWS_ACCESS_KEY_ID=<aws access key id>
AWS_SECRET_ACCESS_KEY=<aws secret access key>
```
