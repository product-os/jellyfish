FROM registry

COPY config.yml /etc/docker/registry/config.yml
RUN mkdir -p /root/certs
COPY token.crt /root/certs/token.crt
