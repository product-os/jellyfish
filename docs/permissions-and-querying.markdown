# Permissions and querying the API

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
