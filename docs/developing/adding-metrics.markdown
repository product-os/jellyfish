# Metrics

This document briefly explains the Jellyfish metrics infrastructure and where to start when looking to add new metrics.

## Production Graphs

Production Jellyfish metrics are gathered and processed by [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/) instances defined in the [balena-io/balena-monitor](https://github.com/balena-io/balena-monitor) repository.
The real-time Jellyfish graphs can be viewed [here](https://monitor.k8s.balena-cloud.com/d/jellyfish/jellyfish?orgId=1).

## Adding Metrics

Jellyfish uses [node-metrics-gatherer](https://github.com/balena-io-modules/node-metrics-gatherer)
to gather and expose metrics data. `lib/metrics/index.js` uses this library to define and export
Jellyfish-specific logic and wrappers for the rest of the system to use. This setup makes it quite
easy for anyone to add new metrics to Jellyfish, usually with only a couple of lines.

When adding metrics and/or labels, please make sure to adhere to [Prometheus naming conventions](https://prometheus.io/docs/practices/naming/).
Also be sure to add a detailed description to each metric as this becomes a quite useful tooltip in Grafana.
Example descriptions can be found in `lib/metrics/index.js`.

Take a look through the following docs and past pull requests to get started:
- [balena-io-modules/node-metrics-gatherer](https://github.com/balena-io-modules/node-metrics-gatherer)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [PR Example #1](https://github.com/product-os/jellyfish/pull/3502/files)
- [PR Example #2](https://github.com/product-os/jellyfish/pull/3619/files)

## Current Metrics
The following is a list of our current metrics along with their labels, if any.
For more detailed information as to what actions each of the following metrics are tied to
and how everything is wired, take a look at the `metricNames` variable at the top of
`lib/metrics/index.js` and perform a few `grep`s under `apps/` and `lib/` for "metrics".

### Cards
- `jf_card_insert_total`: Number of cards inserted using an SQL `INSERT` statement
  - `type`: Card type
- `jf_card_upsert_total`: Number of cards upserted using an SQL `INSERT ... ON CONFLICT DO UPDATE` statement
  - `type`: Card type
- `jf_card_read_total`: Number of cards read from the database or cache
  - `type`: Card type
  - `source`: What source the card was read from (`database` or `cache`)

### Mirrors
- `jf_mirror_total`: Number of mirror calls made to external services
  - `type`: Integration name (eg. `github`)
- `jf_mirror_duration_ms`: Amount of time taken to perform mirrors
  - `type`: Integration name (eg. `github`)
- `jf_mirror_failure_total`: Number of mirror call failures
  - `type`: Integration name (eg. `github`)

### Translates
- `jf_translate_total`: Number of translates performed
  - `type`: Integration name (eg. `github`)
- `jf_translate_duration_ms`: Amount of time taken to perform translates
  - `type`: Integration name (eg. `github`)

### Worker
- `jf_worker_saturation`: Number of jobs in queue
  - `type`: Action request type
- `jf_worker_job_duration_ms`: Amount of time taken to perform jobs
  - `type`: Action request type
- `jf_worker_action_request_total`: Number of action requests
  - `type`: Action request type

### HTTP
- `jf_http_api_query_duration`: Amount of time taken to complete `/query` requests
- `jf_http_api_type_duration`: Amount of time taken to complete `/type` requests
- `jf_http_api_id_duration`: Amount of time taken to complete `/id` requests
- `jf_http_api_slug_duration`: Amount of time taken to complete `/slug` requests
- `jf_http_api_action_duration`: Amount of time taken to complete `/action` requests
- `jf_http_whoami_query_duration`: Amount of time taken to complete `/whoami` requests
- `jf_http_api_query_total`: Number of `/query` requests
- `jf_http_api_type_total`: Number of `/type` requests
- `Jf_http_api_id_total`: Number of `/id` requests
- `jf_http_api_slug_total`: Number of `/slug` requests
- `jf_http_api_action_total`: Number of `/action` requests
- `jf_http_whoami_query_total`: Number of `/query` requests
- `jf_http_api_query_failure_total`: Number of `/query` request failures
- `jf_http_api_type_failure_total`: Number of `/type` request failures
- `jf_http_api_id_failure_total`: Number of `/id` request failures
- `jf_http_api_slug_failure_total`: Number of `/slug` request failures
- `jf_http_api_action_failure_total`: Number of `/action` request failures
- `jf_http_whoami_query_failure_total`: Number of `/whoami` request failures

### SQL
- `jf_sql_gen_duration_ms`: Amount of time taken, in milliseconds, to generate SQL
- `jf_query_duration_ms`: Amount of time taken to execute an SQL query

### Streams
- `jf_streams_saturation`: Number of streams open
  - `table`: Table name (eg. `cards`)
  - `actor`: Actor type (eg. `socket`, `request`, `worker`)
- `jf_streams_link_query_total`: Number of times streams query links
  - `table`: Table name (eg. `cards`)
  - `actor`: Actor type (eg. `socket`, `request`, `worker`)
  - `type`: Change type (eg. `insert`, `update`)
  - `card`: Card type (eg. `message`, `repository`, `support-thread`)
- `jf_streams_error_total`: Number of stream errors
  - `table`: Table name (eg. `cards`)
  - `actor`: Actor type (eg. `socket`, `request`, `worker`)
