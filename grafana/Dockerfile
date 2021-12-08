FROM grafana/grafana:8.3.0

USER root

COPY grafana.ini /etc/grafana/
COPY provisioning /etc/grafana/

RUN chown -R grafana /etc/grafana

USER grafana
