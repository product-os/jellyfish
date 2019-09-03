# Jellyfish Architecture

## Deployable Components

### [`apps/action-server`](https://github.com/balena-io/jellyfish/tree/master/apps/action-server)

The action server worker, which dequeues action requests from the database
and executes them with the configured action library.

### [`apps/chat-widget`](https://github.com/balena-io/jellyfish/tree/master/apps/chat-widget)

The chat widget is an embeddable component to allow external clients to send
and receive messages using the Jellyfish system.

### [`apps/server`](https://github.com/balena-io/jellyfish/tree/master/apps/server)

The Jellyfish HTTP and WebSockets API.

### [`apps/ui`](https://github.com/balena-io/jellyfish/tree/master/apps/ui)

This is the main Jellyfish web user interface, and what most people will
interact with.

## Internal Libraries

A set of re-usable libraries that the top level components use.

### [`lib/action-library`](https://github.com/balena-io/jellyfish/tree/master/lib/action-library)

The action library consists of a set of actions with which the system
provisions workers.

### [`lib/assert`](https://github.com/balena-io/jellyfish/tree/master/lib/assert)

The Jellyfish system distinguishes between two types of errors:

- Internal errors, which are unexpected and should be fixed as soon as possible
- User errors, which are the responsibility of the user and are usually the
	result of bad user usage of the system

This module provides a handy set of functions to write concise assertions for
both types of errors, and remove the amount of error handling `if` conditionals
throughout the code

### [`lib/core`](https://github.com/balena-io/jellyfish/tree/master/lib/core)

The Jellyfish core is a low-level internal SDK to interact with cards in the
database, providing functions like `.getCardById()` or `.insertCard()`. The
core provides the foundation library for the rest of system.

#### Goals

- The core aims to expose a small and simple interface
- The core aims to **not** expose any details about the underlying database
	implementations
- The core aims for correctness and speed
- The core aims to be the only module in the system that directly interacts
	with the database

### [`lib/environment`](https://github.com/balena-io/jellyfish/tree/master/lib/environment)

This module aims to be the startup system configuration hub, and it exposes any
runtime settings to the remainingg of the system. Its the only place in the
codebase that should ever read environment variables.

### [`lib/jellyscript`](https://github.com/balena-io/jellyfish/tree/master/lib/jellyscript)

Jellyscript is a tiny embeddable language to define
computed properties in Jellyfish card types.

### [`lib/logger`](https://github.com/balena-io/jellyfish/tree/master/lib/logger)

The Jellyfish backend strongly discourages the use of `console.log()`. This
module provides a set of functions that the backend uses for logging purposes.

#### Goals

- The logger takes a request ID parameter to easily filter down logss that
	correspond to a single system request
- The logger is able to log uncaught exceptions
- The logger is able to send logs using different priority levels
- The logger is able to preserve rich object logs
- The logger is able to pipe logs to a central location when running in
	production

### [`lib/queue`](https://github.com/balena-io/jellyfish/tree/master/lib/queue)

The Jellyfish system processes incoming action requests and adds them to a
queue. The system can dequeue the next action request, execute it, and post the
results back. This module provides a small set of functions to perform any
action request queue-related operations.

No module that interacts with the action request queue should try to bypass
this module.

#### Goals

- The queue aims to be fast
- The queue aims to be a layer on top of the core to effectively manage action
	requests
- The queue aims to be the source of truth of how action requests are marked as
	executed and how action requests results are propagated back

### [`lib/sdk`](https://github.com/balena-io/jellyfish/tree/master/lib/sdk)

The sdk is a client side library to interact with the Jellyfish infrastructure
through its public interfaces (i.e. HTTP). Its meant to provide high level
useful functionality to the web UI and any other clients.

### [`lib/sync`](https://github.com/balena-io/jellyfish/tree/master/lib/sync)

This module contains an integration syncing engine built on top of Jellyfish,
along with a set of integrations with third party services.

### [`lib/ui-components`](https://github.com/balena-io/jellyfish/tree/master/lib/ui-components)

This module is a collection of re-usable React component that Jellyfish uses to
build all its official user interfaces.

### [`lib/uuid`](https://github.com/balena-io/jellyfish/tree/master/lib/uuid)

UUIDs are the standard identifiers in the Jellyfish world. This module aims to
provide Node.js and browser friendly UUID related utilities.

### [`lib/worker`](https://github.com/balena-io/jellyfish/tree/master/lib/worker)

Jellyfish workers are in charge of consuming action requests from the queue,
executing them, and reporting back the results. This module provides an lower
level interface to write a worker server. The intention is that we can write
multiple types of workers, optimised for different tasks using a single shared
framework.

