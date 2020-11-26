FROM registry

COPY config.yml /etc/docker/registry/config.yml
RUN mkdir -p /root/certs
COPY api/api.localhost:5000.crt /root/certs/token.crt
