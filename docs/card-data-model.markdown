# The card data model

Every entity in the system is a data structure we call
a "card". Cards are an implementation of the [contracts data model](https://github.com/balena-io/balena/pull/1002).

All interactions in the system are described using cards. If you update a card,
an "update" card is created, if you log in to the system, a "session" card is
created. This has a lot of advantages as we can easily apply permissions to
actions run against the system without "custom" logic, and we get features like
activity logs and update history built into the core system.

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
