#!/bin/bash

set -eu

APPS="$(find apps -maxdepth 1 -mindepth 1 -type d | sort -g)"
CWD="$(pwd)"

echo "# Jellyfish Architecture"
echo ""
echo "The Jellyfish system is a multi-container application where all apps
are located in a single repository. The \`apps\` directory contains the deployable components.

The system consists of a big bucket of JSON based data structures we call
\"cards\" (the only entity in the system). Every card has a set of top level
properties (such as \`id\` and \`type\`) and an extensible \`data\` object that
contains every type specific properties. Cards can be linked to other cards to
model relationships.

This is a complete graph of all the components we have in production and how
they connect to each other:"
echo ""
echo "![Architecture Diagram](./docs/assets/architecture.svg)"
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

The Jellyfish system also interacts with various third party services as
GitHub. The API receives webhooks from these third party services, translates
them into cards in the system, and mirrors changes back to the third party
services as needed using actions.

## Modules

Jellyfish is split in many more modules than deployable units. The following diagrams give a overview of their interdependencies:
* [Package Dependencies](https://drive.google.com/file/d/1Q9b7whyhIlql1mvYWdzKPdBQy_eeMxCA/view)
* [Dev Dependencies](https://drive.google.com/file/d/10YahqaWGjQ4dcTPo1HuiMJYZig6DXZAn/view)"
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
