#!/bin/sh

set -eu

print_header() {
	echo "#--------------------------------"
	echo "# $1"
	echo "#--------------------------------"
}

print_header "Queues"
rabbitmqctl list_queues
print_header "Consumers"
rabbitmqctl list_consumers
