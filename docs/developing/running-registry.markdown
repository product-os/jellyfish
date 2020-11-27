Setting up the registry
=======================

The `docker-compose.registry.yml` in the root of this repository will run an
instance of open-balena-registry that uses jellyfish for authentication.

Setting this up requires a few environment variables to be present that configure
authenticated communication between the two.

<details>
<summary>Shortcut: use this .env file for development</summary>

```sh
REGISTRY_HOST=registry.ly.fish.local
REGISTRY_SECRETKEY=foobar
REGISTRY_TOKEN_AUTH_CERT_ISSUER=api.ly.fish.local
REGISTRY_TOKEN_AUTH_JWT_ALGO=ES256
REGISTRY_TOKEN_AUTH_REALM=http://api.ly.fish.local/v1/registry
REGISTRY_TOKEN_AUTH_CERT="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJqVENDQVRPZ0F3SUJBZ0lVVjVRZ2xNSDRuK2wrZGF6eE1PZG1vQldqTFhJd0NnWUlLb1pJemowRUF3SXcKSERFYU1CZ0dBMVVFQXd3UllYQnBMbXg1TG1acGMyZ3ViRzlqWVd3d0hoY05NakF4TVRJMk1UY3pNalEwV2hjTgpNakl4TVRJMk1UY3pNalEwV2pBY01Sb3dHQVlEVlFRRERCRmhjR2t1YkhrdVptbHphQzVzYjJOaGJEQlpNQk1HCkJ5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRE5IUkNWYmthZlpZaWxGY3dXd2F0bkN6bEt1VHlEZmdLTVoKZ3BhbUJVR08vRlNIMGhjTU9CYTE5V3p2eFJXN05GOWNwRmVIZSszQndWdnB4OGIxOTZTalV6QlJNQjBHQTFVZApEZ1FXQkJRelc5SDJab3VDa2NsaVJrRHYwRnJUQSthbmtUQWZCZ05WSFNNRUdEQVdnQlF6VzlIMlpvdUNrY2xpClJrRHYwRnJUQSthbmtUQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01Bb0dDQ3FHU000OUJBTUNBMGdBTUVVQ0lHRWQKTXF1UGJtcTNoV1hRbkowTUpieHc1RWJLMEFWQndhem9GR2F6RFVxTkFpRUF4MzFqdEpPUUEveWNPQlIyZDEyTgpQZ3dacjdZWTN3TUJ4RWtaS2VXR3FuQT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo="
REGISTRY_TOKEN_AUTH_CERT_KEY="LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUtYdzQxTDFBdFRGK01kMzJ1Rnd1NnpKWExNRktaTzBBRGNEWEh1bEZFNk5vQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFTTBkRUpWdVJwOWxpS1VWekJiQnEyY0xPVXE1UElOK0FveG1DbHFZRlFZNzhWSWZTRnd3NApGclgxYk8vRkZiczBYMXlrVjRkNzdjSEJXK25IeHZYM3BBPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo="
REGISTRY_TOKEN_AUTH_CERT_KID="UEYzSDoyNkZSOkxZUzM6VElZVToySlVJOkEySEU6N1pYVDpHM0I1OkhYNzQ6NVVFQjpTTlUyOkI1Skw="
REGISTRY2_CACHE_ENABLED=false
```

</details>

**REGISTRY_TOKEN_AUTH_CERT_ISSUER**
sets the address of the jellyfish service
that will act as the authenticator for the registry, use
`api.jel.ly.fish.local` for development.

**REGISTRY_TOKEN_AUTH_CERT**
**REGISTRY_TOKEN_AUTH_CERT_KEY**
**REGISTRY_TOKEN_AUTH_CERT_KID**
set the actual certificate and key used to sign requests between the registry
and jellyfish.

Run https://github.com/balena-io/open-balena/blob/master/scripts/gen-token-auth-cert
with **REGISTRY_TOKEN_AUTH_CERT_ISSUER** as the argument.
This generates 3 files that should be stored in env vars as base64 encoded strings.

```
 api/
 ├── ${REGISTRY_TOKEN_AUTH_CERT_ISSUER}.crt # base64 -w0 > REGISTRY_TOKEN_AUTH_CERT
 ├── ${REGISTRY_TOKEN_AUTH_CERT_ISSUER}.pem # base64 -w0 > REGISTRY_TOKEN_AUTH_CERT_KEY
 └── ${REGISTRY_TOKEN_AUTH_CERT_ISSUER}.kid # base64 -w0 > REGISTRY_TOKEN_AUTH_CERT_KID
```

**REGISTRY_TOKEN_AUTH_JWT_ALGO**
is the JWT algorithm the authenticator uses, set to `ES256` for development.

**REGISTRY_HOST**
is the hostname of the registry, use `registry.ly.fish.local` for development.

**REGISTRY_TOKEN_AUTH_REALM**
is the endpoint that provides the authentication functionality,
use `http://${REGISTRY_TOKEN_AUTH_CERT_ISSUER}/v1/registry` for development.


resources
---------

https://docs.docker.com/registry/spec/auth/jwt/
https://docs.docker.com/registry/spec/auth/scope/
https://docs.docker.com/registry/spec/auth/token/
