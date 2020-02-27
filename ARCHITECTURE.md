# Jellyfish Architecture

The Jellyfish system is a multi-container application where all the code lives
in a single repository. The `apps` directory contains deployable components
while `lib` consists of re-usable internal libraries that the deployable
components rely on.

The system consists a big bucket of JSON based data structures we call
"cards" (the only entity in the system). Every card has a set of top level
properties (such as `id` and `type`) and an extensible `data` object that
contains every type specific properties. Cards can be linked to other cards to
model relationships.

This is a complete graph of all the components we have in production and how
they connect to each other:

![Architecture Diagram](./docs/assets/architecture.png)

The users load the web application from https://jel.ly.fish using one of the UI
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

All interactions in the system are described using cards. If you update a card,
an "update" card is created, if you log in to the system, a "session" card is
created. This has a lot of advantages as we can easily apply permissions to
actions run against the system without "custom" logic, and we get features like
activity logs and update history built into the core system.

The Jellyfish system also interacts with various third party services as
GitHub. The API receives webhooks from these third party services, translates
them into cards in the system, and mirrors changes back to the third party
services as needed using actions.

## The card data model

As previously mentioned, every entity in the system is a data structure we call
a "card". Cards are an implementation of the [contracts data model](https://github.com/balena-io/balena/pull/1002).
Every card has a `type` field that specifies type that the card is an instance
of. Card type definitions are indicated by having a `type` of `type`, e.g.

```json
{
	"slug": "message",
	"type": "type",
	...
}
```

These "type" cards contain model definitions in the form of a JSON schema. The
slug of a type card is the value used in the type property of instances of the
type.
As an example, you can look at the [type card for a "message"](https://github.com/balena-io/jellyfish/blob/master/apps/server/default-cards/contrib/message.json). You can see that under the `data` key, there is a `schema` value that defines the shape of a card of type "message".
We follow the JSON schema spec, so if the schema allows, additional fields can
be added to a card that are not defined in the type schema.

## Permissions and querying the API

JSON schema is used to query the API, with any cards that match the provided JSON
schema being returned in the result set. Every user in the system must have at
least one role, which corresponds to a card of type "role". Role cards contain
a schema that defines which cards the user with that role can read and
write. When a query is made, the schemas in the user's roles are combined
with the user's query using an AND operator.
Additionally, can specify which fields should be returned by interpreting the use of
`additionalProperties: false` in JSON schemas. If `additionalProperties` is set
to false in a JSON schema, then only the defined properties in the schema will be returned.
When combined with role schemas, we can set permissions on a per-field basis.
For example, we can express that a user can view their password hash, but
not other user's.
This behaviour is based on the [AJV "removeAdditional" option](https://ajv.js.org/#filtering-data).

The roles system is complemented by another permissions system called "markers".
Markers allow individual cards to be restricted to one or more users. A marker
is a string that corresponds to either a user or organisation slug and they
appear as an array at the top level of a card under the key `markers`.

```json
{
	...
	"markers": [ "user-lucianbuzzo", "org-balena" ]
	...
}
```

To view a card, a user must have access to all the markers on that card. A user
has access to their marker (which is the slug of their user card) and the
markers for each organisation they are a member of. Markers can also be in the
form of a compound marker, which is 2 or more markers concatenated with a `+`
symbol. A user has access to a card with a compound marker if they have access
to at least one of the markers that make up the compound marker.
If a card has no markers on it, then the card is unrestricted by the markers system.

For example, if my user slug is `user-lucianbuzzo` and I am a member of the `org-balena` org, then I would be able to
view cards with the markers:
- `[]` (i.e. no markers defined)
- `[ "org-balena", "user-lucianbuzzo" ]`
- `[ "user-lucianbuzzo" ]`
- `[ "org-balena+user-lucianbuzzo" ]`
- `[ "foobar+user-lucianbuzzo" ]`
- `[ "org-balena+user-foobar" ]`

However, I wouldn't be able to view cards with the markers
- `[ "user-foobar" ]`
- `[ "user-foobar", "user-lucianbuzzo" ]`
- `[ "org-balena", "user-foobar" ]`
- `[ "org-balena", "user-foobar+user-bazbuzz" ]`


## Deployable Components

### [`apps/action-server`](https://github.com/balena-io/jellyfish/tree/master/apps/action-server)

The action server worker, which dequeues action requests from the database
and executes them with the configured action library.

### [`apps/livechat`](https://github.com/balena-io/jellyfish/tree/master/apps/livechat)

This is the demo project for developing chat-widget.

### [`apps/server`](https://github.com/balena-io/jellyfish/tree/master/apps/server)

The Jellyfish HTTP and WebSockets API.

### [`apps/sidecar`](https://github.com/balena-io/jellyfish/tree/master/apps/sidecar)

A utility container to run tests against the other
containers.

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

### [`lib/chat-widget`](https://github.com/balena-io/jellyfish/tree/master/lib/chat-widget)

The chat widget is an embeddable component to allow external clients to send
and receive messages using the Jellyfish system.

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

### [`lib/coverage`](https://github.com/balena-io/jellyfish/tree/master/lib/coverage)

A set of utilities to help creating code coverage reports out of
the different parts of the Jellyfish codebase.

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

