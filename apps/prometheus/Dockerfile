FROM prom/prometheus:v2.36.0

COPY balena.sh /usr/local/bin/

COPY prometheus.template ./

ENTRYPOINT /usr/local/bin/balena.sh

CMD [ "--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus" ]
