FROM balena/open-balena-registry:v2.24.3

COPY ./registry.yml /etc/registry.yml
COPY ./api.ly.fish.local.crt /token.crt

VOLUME /balena
VOLUME /data
