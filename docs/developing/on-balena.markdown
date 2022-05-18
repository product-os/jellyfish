# Developing on balenaOS

## ToC
* [Dependencies](#dependencies)
* [Provisioning balenaOS](#provisioning)
* [Developing with Livepush](#development)
* [Running e2e/integration tests](#testing)
* [Footnotes](#footnotes)


## Dependencies
> all reference commands assume a Linux/BSD compatible execution environment and a Bash
  shell.

* Intel NUC or another amd64 device capable of running balenaOS[[fn1](#fn1)]
* a balenaCloud account with access to [jellyfish-on-balena] fleet
* balena CLI, openssl, jq, yq v4+ and Etcher[[fn3](#fn3)]
* single network broadcast domain containing the development environment[[fn4](#fn4)]


## Provisioning
* request access to [jellyfish-on-balena] fleet and provision your device into it
* login to balenaCloud

```sh
balena login
```

* find your device and configure environment

```sh
source ./scripts/get-device.sh
```

* enable [Public device URL]

```sh
balena device public-url "${SHORT_UUID}" --enable
```


## Development

### Livepush
* enable [local-mode]

```sh
balena device local-mode "${SHORT_UUID}" --enable
```

* create `~/.balena/secrets.json` containing your DockerHub credentials

```json
{
  "https://index.docker.io/v1/": {
    "username": "{{username}}",
    "password": "{{access-token}}"
  }
}
```

* reveal secrets

```sh
git secret reveal -f
```

* Livepush

```sh
npm run push
```

* pull down the CA bundle

```sh
source ./scripts/get-ca-bundle.sh
```

* configure operating system (**macOS**)

```sh
sudo security add-trusted-cert -d \
  -r trustAsRoot \
  -k /Library/Keychains/System.keychain \
  ${NODE_EXTRA_CA_CERTS}
```

* configure operating system (**Windows**)

```PowerShell
Import-Certificate -FilePath "${NODE_EXTRA_CA_CERTS}" `
  -CertStoreLocation Cert:\LocalMachine\Root
```

* configure operating system (**Arch Linux**)

```sh
sudo trust anchor --store "${NODE_EXTRA_CA_CERTS}"
```

* configure operating system (**Ubuntu/Debian**)

```sh
sudo cp ${NODE_EXTRA_CA_CERTS} /usr/local/share/ca-certificates/productOS.pem \
  && sudo update-ca-certificates
```

* configure operating system (**CentOS**)

```sh
sudo yum install ca-certificates \
  && sudo update-ca-trust force-enable \
  && sudo cp ${NODE_EXTRA_CA_CERTS} /etc/pki/ca-trust/source/anchors/productOS.pem \
  && update-ca-trust extract
```

* verify that all of backends are up

```sh
open https://balena:${LONG_UUID}@stats.${LONG_UUID}.${TLD}:1936/metrics
```

* open Jellyfish

```sh
open https://jel.${LONG_UUID}.${TLD}
```

You're done! 🎉


## Testing

* execute e2e tests

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
