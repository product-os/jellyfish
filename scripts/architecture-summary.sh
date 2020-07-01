#!/bin/bash

###
# Copyright (C) Balena.io - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited.
# Proprietary and confidential.
###

set -eu

MODULES="$(find lib -maxdepth 1 -mindepth 1 -type d | sort -g)"
APPS="$(find apps -maxdepth 1 -mindepth 1 -type d | sort -g)"
CWD="$(pwd)"

echo "# Jellyfish Architecture"
echo ""
echo "The Jellyfish system is a multi-container application where all the code lives
in a single repository. The \`apps\` directory contains deployable components
while \`lib\` consists of re-usable internal libraries that the deployable
components rely on.

The system consists a big bucket of JSON based data structures we call
\"cards\" (the only entity in the system). Every card has a set of top level
properties (such as \`id\` and \`type\`) and an extensible \`data\` object that
contains every type specific properties. Cards can be linked to other cards to
model relationships.

This is a complete graph of all the components we have in production and how
they connect to each other:"
echo ""
echo "![Architecture Diagram](./docs/assets/architecture.png)"
echo ""
echo "The users load the web application from https://jel.ly.fish using one of the UI
container replicas. The UI containers communicate with the API at
https://api.ly.fish using either HTTP or WebSockets (for streaming).

The API support three types of operations: reading, streaming, and executing
actions.

In the case of reading and streaming, the API supports various endpoints to get
elements by id, slug, or using a free-form JSON Schema, and a way to stream any
changes to the elements in the system that match a certain JSON Schema.

Executing actions is the only way to insert or update elements in the system.
The flow goes like this:

- The user sends an HTTP request to the API with an action request
- The API adds a new action request element to the action queue
- The API opens a stream to wait for execute events on that action request
- One of the workers dequeues the action request, executes it, and posts back
	the results
- The API detects the execute event and forwards it to the user

The tick server is an special type of worker that periodically checks the time
triggered actions configured in the system and execute them when they are due.

The Jellyfish system also interacts with various third party services as
GitHub. The API receives webhooks from these third party services, translates
them into cards in the system, and mirrors changes back to the third party
services as needed using actions."
echo ""
echo "## Deployable Components"
echo ""
for app in $APPS; do
	echo "Processing app $app" 1>&2
	URL="https://github.com/product-os/jellyfish/tree/master/$app"
	echo "### [\`$app\`]($URL)"
	echo ""
	cat "$CWD/$app/DESCRIPTION.markdown"
	echo ""
done
echo "## Internal Libraries"
echo ""
echo "A set of re-usable libraries that the top level components use."
echo ""
for module in $MODULES; do
	echo "Processing module $module" 1>&2
	URL="https://github.com/product-os/jellyfish/tree/master/$module"
	echo "### [\`$module\`]($URL)"
	echo ""
	cat "$CWD/$module/DESCRIPTION.markdown"
	echo ""
done
