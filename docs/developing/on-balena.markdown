# Developing on balenaOS

## ToC
* [Dependencies](#dependencies)
* [Provisioning balenaOS](#provisioning)
* [Developing with Livepush](#development)
* [Running e2e/integration tests](#testing)
* [Footnotes](#footnotes)

## Dependencies
> All reference commands assume a Linux/BSD compatible execution environment and a Bash shell.

* Intel NUC or another amd64 device capable of running balenaOS[[fn1](#fn1)]
* A balenaCloud account with access to [jellyfish-on-balena] fleet
* balena CLI, openssl, jq, yq v4+ and Etcher[[fn3](#fn3)]
* Single network broadcast domain containing the development environment[[fn4](#fn4)]

## Provisioning
* Request access to [jellyfish-on-balena] fleet and provision your device into it
* Login to balenaCloud

```sh
balena login
```

* Find your device and configure environment

```sh
source ./scripts/get-device.sh
```

* Enable [Public device URL]

```sh
balena device public-url "${SHORT_UUID}" --enable
```

## Development

### Livepush
* Enable [local-mode]

```sh
balena device local-mode "${SHORT_UUID}" --enable
```

* Create `~/.balena/secrets.json` containing your DockerHub credentials

```json
{
  "https://index.docker.io/v1/": {
    "username": "{{username}}",
    "password": "{{access-token}}"
  }
}
```

* Reveal secrets

```sh
git submodule update --init
git secret reveal -f
```

* Livepush

```sh
npm run push
```

* Pull down the CA bundle

```sh
source ./scripts/get-ca-bundle.sh
```

* Configure operating system (**macOS**)

```sh
sudo security add-trusted-cert -d \
  -r trustAsRoot \
  -k /Library/Keychains/System.keychain \
  ${NODE_EXTRA_CA_CERTS}
```

* Configure operating system (**Windows**)

```PowerShell
Import-Certificate -FilePath "${NODE_EXTRA_CA_CERTS}" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

* Configure operating system (**Arch Linux**)

```sh
sudo trust anchor --store "${NODE_EXTRA_CA_CERTS}"
```

* Configure operating system (**Ubuntu/Debian**)

```sh
sudo cp ${NODE_EXTRA_CA_CERTS} /usr/local/share/ca-certificates/productOS.pem \
  && sudo update-ca-certificates
```

* Configure operating system (**CentOS**)

```sh
sudo yum install ca-certificates \
  && sudo update-ca-trust force-enable \
  && sudo cp ${NODE_EXTRA_CA_CERTS} /etc/pki/ca-trust/source/anchors/productOS.pem \
  && update-ca-trust extract
```

* Verify that all of backends are up

```sh
open https://balena:${LONG_UUID}@stats.${LONG_UUID}.${TLD}:1936/metrics
```

* Open Jellyfish

```sh
open https://jel.${LONG_UUID}.${TLD}
```

You're done! 🎉

* Working with libraries

If you are going to be working with any libraries, clone them under `.libs` and checkout your branches.
Be sure to clone them with the right scope if necessary, for example:
```
cd .libs
mkdir -p @balena
cd @balena
git clone git@github.com:product-os/jellyfish-worker.git
```

Finally, deploy everything to the device by executing `npm run push` from the repository root.
During the bootstrap phase a default user contract with username and password equal to jellyfish is inserted.
With those credentials you can start interacting with Jellyfish, for instance using [Jellyfish client SDK](https://github.com/product-os/jellyfish-client-sdk).

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

* Resetting

Deleting cloned libraries from `.libs/` or deleting library tarballs from `apps/*/packages/` doesn't currently
reset that library to it's original state in the app(s) on your Livepush device. This can lead to a confusing
state in which your local source doesn't correctly mirror what's being executed on your device. To reset your
device back to a clean state:
- `rm -fr .libs/*` (Assuming you no longer need these libraries)
- `NOCACHE=1 npm run push`

The `NOCACHE` option sets the `--nocache` flag for `balena push`: [balena CLI Documentation](https://www.balena.io/docs/reference/balena-cli/#-c---nocache)

## Testing
Example of running e2e tests:
```sh
echo 'SUT=1 scripts/ci/run-tests.sh \
  wait-for-api \
  integration-server \
  e2e \
  e2e-ui \
  export-database \
  import-database \
  e2e-server-previous-dump' | balena ssh "${SHORT_UUID}.local" jellyfish-tests
```

## Footnotes

### [fn1](https://github.com/balena-io/balena-on-balena/blob/master/docs/development.md#fn1)
### [fn3](https://github.com/balena-io/balena-on-balena/blob/master/docs/development.md#fn3)
### [fn4](https://github.com/balena-io/balena-on-balena/blob/master/docs/development.md#fn4)

[documentation]: https://www.balena.io/docs/learn/welcome/introduction/
[jellyfish-on-balena]: https://dashboard.balena-cloud.com/fleets/1842831/summary
[Public device URL]: https://www.balena.io/docs/learn/develop/runtime/#public-device-urls
[local-mode]: https://www.balena.io/docs/learn/develop/local-mode/
