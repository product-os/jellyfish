# https://hub.docker.com/r/grafana/grafana
FROM grafana/grafana:8.5.6

USER root

RUN mkdir -p /etc/grafana/dashboards/standard
COPY grafana.ini /etc/grafana/
COPY provisioning/dashboards/standard.yml /etc/grafana/provisioning/dashboards/
COPY provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/

RUN chown -R grafana /etc/grafana

USER grafana
