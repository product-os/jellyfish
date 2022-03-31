# https://hub.docker.com/r/grafana/grafana
FROM grafana/grafana:8.4.5

USER root

RUN mkdir -p /etc/grafana/dashboards
COPY grafana.ini /etc/grafana/
COPY provisioning/dashboards/standard.yml /etc/grafana/provisioning/dashboards/
COPY provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/
COPY standard/logs.json /etc/grafana/dashboards/standard/
COPY standard/metrics.json /etc/grafana/dashboards/standard/

RUN chown -R grafana /etc/grafana

USER grafana
