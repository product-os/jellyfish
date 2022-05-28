<p align="center">
	<img src="./banner.png" height="160" />
</p>

Jellyfish is a social knowledge database that the team uses to collaborate,
without being blocked by departmental or hierarchal divisions. Jellyfish
gathers all information company wide and makes it a platform to implement
processes that enhance the team's productivity and understanding. Think of it
as a cross between Slack and Excel!

A "living specification" for the intended functioning of Jellyfish can be found [here](https://docs.google.com/document/d/1psa9upjr__LDbF0442ndW72Nj8jAuA48mmqPdahQBUs/edit?usp=sharing).
Many parts of Jellyfish are still under development, and this document aims to create a source of truth for how the platform *should* work, even if it doesn't represent the current functionality.

***

![Jellyfish Screenshot](./docs/assets/screenshot.png)

***

- **Contributing**
	- [**Design manifesto**](https://github.com/product-os/jellyfish/blob/master/docs/design-manifesto.markdown)
	- [**Architecture overview**](https://github.com/product-os/jellyfish/blob/master/ARCHITECTURE.md)
	- [**AutumnDB**](https://github.com/product-os/autumndb/blob/master/README.md) the low-level internal SDK to interact with contracts and links in the database
	- [**Plugin development**](https://github.com/product-os/jellyfish/blob/master/docs/developing/plugins.markdown)
	- [**Adding a new type**](https://github.com/product-os/jellyfish/blob/master/docs/developing/add-new-type.markdown)
	- [**Running tests**](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests.markdown)
	- [**Adding metrics**](https://github.com/product-os/jellyfish-metrics/blob/master/doc/adding-metrics.markdown)
	- [**Writing translate tests**](https://github.com/product-os/jellyfish-test-harness/blob/master/doc/writing-translate-tests.markdown)
	- [**Managing secrets**](https://github.com/product-os/secrets)
- **Links**
	- [**Production logs**](https://monitor.balena-cloud.com/explore?left=%5B%22now-3h%22,%22now%22,%22loki%22,%7B%22expr%22:%22%22,%22datasource%22:%22loki%22,%22refId%22:%22A%22%7D%5D&orgId=1)
	- [**Sentry**](https://sentry.io/organizations/balena/issues/?project=1366139)
	- [**New Relic**](https://synthetics.newrelic.com/accounts/2054842/monitors/8bf2b38d-7c2a-4d71-9629-7cbf05b6bd21)
	- [**Metrics**](https://monitor.balena-cloud.com/dashboards/f/auto/auto)
- **Services**
	- [**Using New Relic**](https://github.com/product-os/jellyfish/blob/master/docs/newrelic.markdown)
	- [**Using Balena CI**](https://github.com/product-os/jellyfish/blob/master/docs/balenaci.markdown)
	- [**Using Sentry**](https://github.com/product-os/jellyfish/blob/master/docs/sentry.markdown)
- **Integrations**
	- [**Integrating with GitHub**](https://github.com/product-os/jellyfish/blob/master/docs/integrating-github.markdown)

Installing dependencies
-----------------------

We use Node v16 to develop Jellyfish. First install dependencies with:
```sh
npm i
```

If you get a Playwright installation error, try skipping its browser downloads. [Source](https://github.com/microsoft/playwright/issues/1941#issuecomment-1008338376)
```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true npm i
```

Revealing secrets
-----------------------
We use [`git secret`](https://git-secret.io/) to safely share secrets used during testing and development.
Contact someone on the Jellyfish team if you work at Balena and need access. See [`product-os/secrets`](https://github.com/product-os/secrets)
for more information on how secrets are managed.

Once you have been given access, you can reveal secrets stored under `.balena/secrets` with:
```sh
git submodule update --init
git secret reveal -f
```

Developing with Livepush
------------------------

To start developing, you must first install [balenaCLI](https://github.com/balena-io/balena-cli) and set up a local-mode device. This could be a virtual machine [in VirtualBox](https://www.balena.io/blog/no-hardware-use-virtualbox/) with at least 32 GB of disk space, 4 GB RAM, and 4 CPU cores. It could also be a separate device, such as an Intel NUC (i7 CPU and at least 8GB memory recommended), on your local network to move the heavy lifting off of your main machine.

### Prepare the device
1. Create a new balenaCloud app as described [here](https://www.balena.io/docs/learn/getting-started/intel-nuc/nodejs/)
2. After your device shows up in the dashboard, enable [local mode](https://www.balena.io/docs/learn/develop/local-mode/)

### Deploy code
Now that the device is up and running in local mode, we need to get its local IP address:
```
sudo balena scan | grep address
  address:       <DEVICE-IP-ADDRESS>
```

Add endpoints to local hosts file:
```
<DEVICE-IP-ADDRESS> livechat.ly.fish.local api.ly.fish.local jel.ly.fish.local postgres.ly.fish.local redis.ly.fish.local grafana.ly.fish.local prometheus.ly.fish.local s3.ly.fish.local
```

If you are going to be working with any libraries, clone them under `.libs` and checkout your branches.
Be sure to clone them with the right scope if necessary, for example:
```
cd .libs
mkdir -p @balena
cd @balena
git clone git@github.com:product-os/jellyfish-worker.git
```

Finally, deploy everything to the device by executing `npm run push` from the repository root.

During the bootstrap phase a default user contract with username and password equal to jellyfish is inserted. With those credentials you can start interacting with Jellyfish, for instance using [Jellyfish client SDK](https://github.com/product-os/jellyfish-client-sdk).

Once deployed, app and library source changes will cause quick service reloads. Adding and removing
app dependencies will cause that service's image to be rebuilt from its `npm ci` layer. Adding and
removing library dependencies is a bit different. The following is an example when working with the
`jellyfish-worker` library:

```sh
cd .libs/jellyfish-worker
npm install new-dependency
cd ../..
npm run push:lib jellyfish-worker
```

What this does is create a local beta package for `.libs/jellyfish-worker` using `npm pack` and then
copies the resulting tarball into apps `packages` subdirectories. This triggers partial image rebuilds.
Execute `npm run clean` to delete these tarballs when you no longer need them.

### Opening Jellyfish
Now that the system is up and running, the UI can be opened in your browser:
- Login: http://jel.ly.fish.local
- Username: `jellyfish`
- Password: `jellyfish`

The API is listening at http://api.ly.fish.local, meaning you can work with it directly
using `curl` or other similar tools for debugging/testing if necessary.

### Connecting to Postgres and Redis
The Postgres and Redis services running on the Livepush device can be accessed with:
```
psql -hpostgres.ly.fish.local -Udocker jellyfish -W (password = docker)
redis-cli -h redis.ly.fish.local
```

### Looking at metrics
As instances of Prometheus and Grafana are running as part of the stack, system metrics
can be accessed and monitored by opening the following:
- Prometheus: http://prometheus.ly.fish.local
- Grafana: http://grafana.ly.fish.local

Jellyfish graphs in Grafana are located under the `standard` folder.

### Managing uploaded files
An instance of [`minio`](https://min.io/), an S3-compatible service, also runs as part of
the stack. During development and testing this is the target of any uploads, while production
uses the real AWS S3 service. Visit the following in your browser to manage buckets and
uploaded data:
- Minio admin panel: http://s3.ly.fish.local:43697
- Username: `AKIAIOSFODNN7EXAMPLE`
- Password: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

The minio API is listening on https://s3.ly.fish.local:80 so any debugging/testing can
be done against this endpoint using the AWS CLI, the `aws-sdk` package, etc.

### Resetting
Deleting cloned libraries from `.libs/` or deleting library tarballs from `apps/*/packages/` doesn't currently
reset that library to it's original state in the app(s) on your Livepush device. This can lead to a confusing
state in which your local source doesn't correctly mirror what's being executed on your device. To reset your
device back to a clean state:
- `rm -fr .libs/*` (Assuming you no longer need these libraries)
- `NOCACHE=1 npm run push`

The `NOCACHE` option sets the `--nocache` flag for `balena push`: [balena CLI Documentation](https://www.balena.io/docs/reference/balena-cli/#-c---nocache)

### Troubleshooting
- Tail individual service logs with `balena logs jel.ly.fish.local --service <name>`
- Log into device with `balena ssh`, which allows you to then:
	- Check running containers with `balena ps`
	- Enter running container with `balena exec -ti <name> bash`
	- Check container logs directly from within device using `balena logs <name>`

### Debugging
First, try executing a push with the balenaCLI debug flag enabled: `DEBUG=1 npm run push`.
When using livepush the backend services start with remote debugging enabled via the `--inspect` flag. Use Chrome dev tools, or your IDE to [start a debugging session](https://nodejs.org/en/docs/guides/debugging-getting-started/#inspector-clients).

- To debug API server connect to `<DEVICE-IP-ADDRESS>:9229`
- To debug the worker server connect to `<DEVICE-IP-ADDRESS>:923<WORKER-ID>`
	- e.g. to connect to the first worker `<DEVICE-IP-ADDRESS>:9231`

### Testing
See this guide on [**running tests**](https://github.com/product-os/jellyfish/blob/master/docs/developing/running-tests.markdown) to learn how you can run tests against your up and running Jellyfish instance.

Reporting problems
------------------

If you're having any problems, please [raise an issue](https://github.com/product-os/jellyfish/issues/new) on GitHub and the Jellyfish team will be happy to help.

License
-------

Jellyfish is open-source software. See the LICENSE file for more information.
