New Relic
=========

[New Relic](https://www.newrelic.com) is a monitoring platform with many
sub-products. Jellyfish uses only
[Synthethics](https://newrelic.com/products/synthetics), to monitor if the
system is alive and responding from potentially many regions.

> Contact the ops team if you don't have access to New Relic

You can see all the Synthethics dashboard by clicking "Synthethics" from the
top bar, clicking "Monitors" at the top left and selecting the dashboard that
interests you.

We have two New Relic dashboards:

- **Jellyfish PING**: Sends an action request to the Jellyfish API to confirm
	that the whole backend is working

- **Jellyfish UI**: Checks if the UI is responding and serving web assets (even
	if the backend is down)

This is how one the dashboards looks like:

![Jellyfish PING Overview](./assets/newrelic-jellyfish-ping.png)

The "Overview" section tells you how the application is responding on
customisable time ranges, along with some nice stats. This view is useful if
you want to figure out exactly when an incident started and ended, to inspect
the logs accordingly.

You can inspect a particular request in more detail on the "Results" section:

![Jellyfish PING Results](./assets/newrelic-jellyfish-ping-results.png)

This view gives you a customisable breakdown by region and duration. In this
example, we can see that the "London, England, UK" pings spend some time
connecting to the server due to latency, as the servers live in the US at the
moment of this writing.

You might want to subscribe yourself to Synthethics email notifications to get
alerts when something goes wrong.
