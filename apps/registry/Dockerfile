FROM balena/open-balena-registry:v2.25.0

COPY ./registry.yml /etc/registry.yml
COPY ./api.ly.fish.local.crt /token.crt

VOLUME /balena
VOLUME /data
