# Metrics

This document briefly explains the Jellyfish metrics infrastructure and where to start when looking to add new metrics.

## Production Graphs

Production Jellyfish metrics are gathered and processed by [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/) instances defined in the [balena-io/balena-monitor](https://github.com/balena-io/balena-monitor) repository.
The real-time Jellyfish graphs can be viewed [here](https://monitor.k8s.balena-cloud.com/d/jellyfish/jellyfish?orgId=1).

## Adding Metrics

Jellyfish uses the [balena-io-modules/node-metrics-gatherer](https://github.com/balena-io-modules/node-metrics-gatherer) library to gather and expose metrics data.
Specifically, `lib/metrics/index.js` uses this library to define and export Jellyfish-specific logic and wrappers for the rest of the system to use.
This setup makes it quite easy for anyone to add new metrics to Jellyfish, usually with only a couple of lines.

Take a look through the following docs and past pull requests to get started:
- [balena-io-modules/node-metrics-gatherer](https://github.com/balena-io-modules/node-metrics-gatherer)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [PR Example #1](https://github.com/product-os/jellyfish/pull/3502/files)
- [PR Example #2](https://github.com/product-os/jellyfish/pull/3619/files)

## Current Metrics
For more detailed information as to what actions each of the following metrics are tied to and how everything is wired, take a look at the `metricNames` variable at the top of `lib/metrics/index.js` and perform a few `grep`s under `apps/` and `lib/` for "metrics\.".

- Card upsert total
- Card insert total
- Card read total
- Mirror total
- Mirror duration
- Mirror failure total
- Worker saturation
- Worker job duration
- Worker action request total
- HTTP `/query` request duration
- HTTP `/query` request total
- HTTP get card by ID request total
- HTTP get card by ID request duration
- HTTP get card by slug request total
- HTTP get card by slug request duration
- HTTP `/query` request failure total
- HTTP get card by ID request failure total
- HTTP `/whoami` request total
- HTTP `/whoami` request duration
- System CPU/memory/disk usage
- General API HTTP performance (bytes read/written, latency, request total)
