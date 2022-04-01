# Adding a new type

You can add a new type to Jellyfish by following these steps.

## Add a new type definition contract

New type contracts should be added to a [plugin](./plugins.markdown) repo. Currently most contracts are located in the [`contracts` directory](https://github.com/product-os/jellyfish-plugin-default/tree/master/lib/contracts) of the [`jellyfish-plugin-default` plugin](https://github.com/product-os/jellyfish-plugin-default)

A type contract consists of the standard contract fields and a JSON schema that defines the shape of the new type. For example, a new type contract that defines a Pokémon would look like this


```typescript
import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

export const pokemon: ContractDefinition = {
	// The slug is the machine name of this type and will appear in the "type"
	// field of all Pokémon contracts derived from this type definition
	slug: 'pokemon',
	// Since this is a type definition, it is of the type 'type'. The type is also
	// versioned, to indicate which version of the 'type' type it will validate
	// against
	type: 'type@1.0.0',
	// The name field is the friendly name used when interacting with the type
	// definition in UI (e.g. CRUD operations, forms)
	name: 'Pokémon',
	// Markers are used for defining permissions and will be explained elsewhere
	// in the documentation
	markers: [],
	// The tag field is used to contain tag data, this is an array of strings
	tags: [],
	// In Jellyfish, contracts are "soft deleted" and the active field is used to
	// indicate whether or not the contract is in this state or not. An active value of
	// "false" would indicate that the contract has been deleted
	active: true,
	// ??
	requires: [],
	// ??
	capabilities: [],
	// The data field contains the type definition JSON schema and additional meta
	// data
	data: {
	  // The schema field is a JSON schema defining the shape of a type contract. Type
	  // contracts are also contracts (just like this one) and are merged against the
	  // default contract definition for purposes of validation, so you don't need
	  // to duplicate anything that already exists at the top level.
	  // This schema is used for validating new Pokémon contracts, and for creating
	  // the form used to create them.
	  schema: {
			type: 'object',
			required: ['data'],
			properties: {
				data: {
					type: 'object',
					required: ['firstSeen'],
					properties: {
						height: {
							type: "number"
						},
						weight: {
							type: "number"
						},
						description: {
							type: "string"
						},
						abilities: {
							type: "string"
						},
						pokedexNumber: {
							title: "National Pokèdex Number",
							type: "number"
						},
						caught: {
							type: "boolean"
						},
						firstSeen: {
							title: "First seen",
							description: "The first time you saw this pokèmon",
							type: "string",
							format: "date-time"
						}
					},
				},
			},
		},
	},
};
```

For the sake of keeping things organised, the name of the file should match the
"slug" value of the contract. In the example shown above, the file would be called
`pokemon.ts`.

## Type contracts are loaded when the server starts

When the server starts it loads all contracts from all plugins. You just need to make sure that your new contract is returned as part of the plugin's `contracts` array. Typically this is done by adding a line to the `lib/contracts/index.ts` file in the plugin repo.

Continuing with the Pokèmon contract type example, the line would look like this:

```typescript
import { pokemon } from './pokemon';
```
<!-- 
or, if the contract type made use of mixins:

```javascript
require('./contrib/pokemon.js')(mixins),
```
 -->

and add the `imported` variable to the `contracts` array.

## Surface the new contracts in the web browser client

At this point, users with the `community` role will have CRUD access to the
Pokèmon contract type via the API but it will not show up in the web browser client.
The easiest way to make this happen is to create a new view to list Pokèmon contracts.
As before, the new view contract should be added in the `contracts` directory of the plugin containing the type contract. Here is an example view that displays all Pokèmon contracts:

```typescript
import type { ViewContractDefinition } from '@balena/jellyfish-types/build/core';

export const viewAllPokemons: ViewContractDefinition = {
	slug: 'view-all-pokemons',
	name: 'Pokemons',
	type: 'view@1.0.0',
	// markers: ['org-balena'],
	data: {
    // View contracts should contain an array of objects that define schemas used to
    // select data for the view
		allOf: [
			{
				name: 'All Pokemons',
        // This is a simple schema that selects all contracts that are of type
        // "pokemon"
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'pokemon@1.0.0',
						},
					},
					additionalProperties: true,
					required: ['type'],
				},
			},
		],
	},
};
```

As before, this view contract needs to be returned as part of the plugin's `contracts` array. Typically this is done by adding a line to the `lib/contracts/index.ts` file in the plugin repo.

The line would look like this:


```typescript
import { view-all-pokemon } from './view-all-pokemon';
```
<!-- 
or, if the contract type made use of mixins:

```javascript
require('./contrib/view-all-pokemon.js')(mixins),
```
 -->

and add the `imported` variable to the `contracts` array.


```javascript
require('./contrib/view-all-pokemon.json'),
```
or, if the contract type made use of mixins:

```javascript
require('./contrib/view-all-pokemon.js')(mixins),
```

With this view added, you will see a new view in the left side menu with the title "Pokèmon contracts". If you load this view you will also see a button that allows you to create a new Pokèmon.

