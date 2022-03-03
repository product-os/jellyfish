FROM grafana/grafana:8.4.3

USER root

RUN wget -O /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/v4.16.1/yq_linux_amd64 \
    && wget -O /usr/local/bin/jq https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 \
    && chmod +x /usr/local/bin/yq /usr/local/bin/jq

COPY grafana/grafana.ini /etc/grafana/
COPY grafana/provisioning/dashboards/standard.yml /etc/grafana/provisioning/dashboards/
COPY grafana/provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/
COPY deploy-templates/jellyfish-product/product/deploy/kubernetes/generators/jellyfish-grafana-dash-app-cm.tpl.yml /tmp/dashboard.yml

RUN mkdir -p /etc/grafana/dashboards/standard \
    && yq e '.data' /tmp/dashboard.yml | tail -n+2 | jq -r > /etc/grafana/dashboards/standard/jellyfish.json \
    && chown grafana /etc/grafana/dashboards/standard/jellyfish.json

RUN chown -R grafana /etc/grafana

USER grafana
