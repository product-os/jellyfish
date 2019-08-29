#!/bin/bash

set -eu

QUEUES="$(rabbitmqadmin -f tsv -q list queues name)"
TEST_QUEUES="$(echo "$QUEUES" | grep "test" || true)"
COUNT="$(echo "$TEST_QUEUES" | wc -l | tr -d ' ')"

for queue in $TEST_QUEUES; do
	printf "\rDeleting RabbitMQ queue: %s" "$COUNT"
	rabbitmqadmin -q delete queue name="$queue"
done
printf "\nDeleted %s queues\n" "$COUNT"
