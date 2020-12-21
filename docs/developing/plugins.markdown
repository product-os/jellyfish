# Jellyfish plugins

The Jellyfish system is extensible using a plugin system.

- [Plugin Interface](#plugin-interface)
- [Plugin Components](#plugin-components)
  - [Cards](#cards)
  - [Sync Integrations](#sync-integrations)
  - [Actions](#actions)
  - [Lenses](#lenses)

## Plugin Interface

A Jellyfish plugin must export a class that realises the following interface:

```typescript
interface JellyfishPlugin {
  // A unique identifier for the plugin
  // Should start `jellyfish-plugin-`
  slug: string,

  // A user-friendly name for the plugin
  name: string,

  // An optional description of the plugin
  description?: string,

  // A list of plugin slugs that this plugin depends on
  requires: string[],

  // A method that returns an object of cards, keyed by card slug.
  getCards: () => {
    [key: string]: Card
  }

  // A method that returns an object of sync integrations, keyed by integration slug.
  getSyncIntegrations: () => {
    [key: string]: Integration
  }

  // A method that returns an object of actions, keyed by action slug.
  getActions: () => {
    [key: string]: Action
  }

  // A method that returns an object of lenses, keyed by lens slug.
  getLenses: () => {
    [key: string]: Lens
  }
}
```

## Plugin Components

The architecture of Jellyfish means that you can add almost any functionality simply by adding four types of resources:

1. **Cards** - these can be used to define data types, views and triggered actions.
2. **Sync integrations** - to enable two-way synchronization between Jellyfish and external services.
3. **Actions** - action cards and their matching 'handlers' are used to handle particular actions initiated within Jellyfish.
4. **Lenses** - these can be used to modify the UI based on the card being displayed.

### Cards

Cards should be placed within the `lib/cards` directory of the plugin repo. The card's filename should match the slug of the card.

The interface of a card is actually defined in JSON schema in the [card.js](https://github.com/product-os/jellyfish-core/blob/master/lib/cards/card.js) type card.

Cards can be either JSON or JavaScript files. JavaScript is preferred as it supports the mixin system. Below is a bare-bones example of a card defined in a JavaScript file that uses a mixin:

```javascript
const SLUG = 'my-card'

module.exports = ({
	mixin, someMixin
}) => {
	return mixin(someMixin)({
		slug: SLUG,
		...
	})
}
```

Each card should be added to the 'dictionary' of cards returned by the plugin's `getCards` method. Cards are keyed by their slug.

### Sync integrations

Sync integrations should be placed within the `lib/integrations` directory of the plugin repo. The integation's filename should match the identifying slug of the integration.

A sync integration must be a class that realises the following interface:

```typescript
interface Integration {
	initialize: () => Promise<void>,
	destroy: () => Promise<void>,
	mirror: (card: Card, options: any) => Promise<SyncedItem[]>,
	translate: (event: Event, options: any) => Promise<SyncedItem[]>
}

interface SyncedItem {
  time: Date,
  actor: string,
  card: Card
}
```

Each integration should be added to the 'dictionary' of sync integrations returned by the plugin's `getSyncIntegrations` method. Integrations are keyed by their slug.

### Actions

Actions should be placed within the `lib/actions` directory of the plugin repo. The action's filename should match the identifying slug of the action.

An action must be a literal object that realises the following interface:

```typescript
interface Action {
	card: Card,
	pre: (session: any, context: any, request: any) => Promise<any>,
	handler: (session: any, context: any, card: Card, request: any) => Promise<Card> | null,
}
```

Each action should be added to the 'dictionary' of actions returned by the plugin's `getActions` method. Actions are keyed by their slug.

### Lenses

Lenses should be placed within the `lib/lenses` directory of the plugin repo. The lens' filename should match the identifying slug of the lens.

A lens must be a literal object that realises the following interface:

```typescript
interface Lens {
  slug: string,
	type: 'lens',
	version: string,
	name: string,
	data: {
		icon: string,
		format: string,
		renderer: (props) => React.ReactNode,
		filter?: any
	}
}
```

Each lens should be added to the 'dictionary' of lenses returned by the plugin's `getLenses` method. Lenses are keyed by their slug.
