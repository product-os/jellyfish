# Working with environment variables

We use a combination of plaintext environment variables and secrets stored under `.balena/secrets` to inform the
[`@balena/jellyfish-environment`](https://github.com/product-os/jellyfish-environment) library with what values we want to run the system with.
The secrets can be decrypted with `$ git secret reveal -f` if your GPG key has been given access. Contact someone on the Jellyfish team if you
require access, but do not yet have it.

Take a look through the aforementioned `@balena/jellyfish-environment` codebase to understand what environment variables we use/require.
Overriding the default fallback value can be done with an export: `$ export POSTGRES_HOST=localhost`.
