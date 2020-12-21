# Adding a new type

You can add a new type to Jellyfish by following these steps.

## Add a new type definition card

New type cards should be added to a [plugin](./plugins.markdown) repo. Currently most cards are located in the [`cards` directory](https://github.com/product-os/jellyfish-plugin-default/tree/master/lib/cards) of the [`jellyfish-plugin-default` plugin](https://github.com/product-os/jellyfish-plugin-default)

A type card consists of the standard contract fields and a JSON schema that defines the shape of the new type. For example, a new type card that defines a Pokémon would look like this

```
{
  // The slug is the machine name of this type and will appear in the "type"
  // field of all Pokémon cards derived from this type definition
  "slug": "pokemon",
  // Since this is a type definition, it is of the type "type". The type is also
  // versioned, to indicate which version of the "type" type it will validate
  // against
  "type": "type@1.0.0",
  // By default cards start at version 1.0.0
  "version": "1.0.0",
  // The name field is the friendly name used when interacting with the type
  // definition in UI (e.g. CRUD operations, forms)
  "name": "Pokémon",
  // Markers are used for defining permissions and will be explained elsewhere
  // in the documentation
  "markers": [],
  // The tag field is used to contain tag data, this is an array of strings
  "tags": [],
  "links": {},
  // In Jellyfish, cards are "soft deleted" and the active field is used to
  // indicate whether or not the card is in this state or not. An active value of
  // "false" would indicate that the card has been deleted
  "active": true,
  // The data field contains the type definition JSON schema and additional meta
  // data
  "data": {
    // The schema field is a JSON schema defining the shape of a type card. Type
    // cards are also contracts (just like this one) and are merged against the
    // default contract definition for purposes of validation, so you don't need
    // to duplicate anything that already exists at the top level.
    // This schema is used for validating new Pokémon cards, and for creating
    // the form used to create them.
    "schema": {
      "type": "object",
      "properties": {
        "data": {
          type: "object",
          title: "Pokèmon",
          properties: {
            Height: {
              type: "number"
            },
            Weight: {
              type: "number"
            },
            Description: {
              type: "string"
            },
            Abilities: {
              type: "string"
            },
            pokedex_number: {
              title: "National Pokèdex Number",
              type: "number"
            },
            caught: {
              type: "boolean"
            },
            first_seen: {
              title: "First seen",
              description: "The first time you saw this pokèmon",
              type: "string",
              format: "date-time"
            }
          }
        }
      }
    }
  },
  "requires": [],
  "capabilities": []
}
```

For the sake of keeping things organised, the name of the file should match the
"slug" value of the card. In the example shown above, the file would be called
`pokemon.json`.

## Type cards are loaded when the server starts

When the server starts it loads all cards from all plugins. You just need to make sure that your new card is returned by the plugin's `getCards` method. Typically this is done by adding a line to the `lib/cards/index.js` file in the plugin repo.

Continuing with the Pokèmon card type example, the line would look like this:

```javascript
require('./contrib/pokemon.json'),
```
or, if the card type made use of mixins:

```javascript
require('./contrib/pokemon.js')(mixins),
```

## Surface the new cards in the web browser client

At this point, users with the `community` role will have CRUD access to the
Pokèmon card type via the API but it will not show up in the web browser client.
The easiest way to make this happen is to create a new view to list Pokèmon cards.
As before, the new view card should be added in the `cards` directory of the plugin containing the type card. Here is an example view that displays all Pokèmon cards:

```
{
  "slug": "view-all-pokemon",
  "name": "Pokèmon cards",
  "version": "1.0.0",
  "type": "view@1.0.0",
  "markers": [],
  "tags": [],
  "links": {},
  "active": true,
  "data": {
    // View cards should contain an array of objects that define schemas used to
    // select data for the view
    "allOf": [
      {
        "name": "Pokèmon cards",
        // This is a simple schema that selects all cards that are of type
        // "pokemon"
        "schema": {
          "type": "object",
          "properties": {
            "type": {
              "const": "pokemon"
            }
          },
          "required": [
            "type"
          ],
          "additionalProperties": true
        }
      }
    ],
		// This is an array of preferred lenses used to display the results of this
		// view
    "lenses": [
      "lens-default-list"
    ]
  },
  "requires": [],
  "capabilities": []
}
```

As before, this view card needs to be returned by the plugin's `getCards` method, typically by adding a line to the `lib/cards/index.js` file within the plugin repo.

The line would look like this:

```javascript
require('./contrib/view-all-pokemon.json'),
```
or, if the card type made use of mixins:

```javascript
require('./contrib/view-all-pokemon.js')(mixins),
```

With this view added, you will see a new view in the left side menu with the title "Pokèmon cards". If you load this view you will also see a button that allows you to create a new Pokèmon.

