# Jellyfish plugins

The Jellyfish system is extensible using a plugin system.

- [Plugin Components](#plugin-components)
  - [Contracts](#contracts)
  - [Sync Integrations](#sync-integrations)
  - [Actions](#actions)
  - [Examples](#examples)

## Plugin Components
The architecture of Jellyfish means that you can add almost any functionality simply by adding the following resources:

1. **Contracts** - these can be used to define data types, views and triggered actions.
2. **Sync integrations** - to enable two-way synchronization between Jellyfish and external services.
3. **Actions** - action cards and their matching 'handlers' are used to handle particular actions initiated within Jellyfish.

### Contracts
Contracts should be placed within the `lib/contracts` directory of the plugin repo. The contract's filename should match the slug of the contract.
The interface of a contract is actually defined in JSON schema in the [card](https://github.com/product-os/autumndb/blob/master/lib/contracts/card.ts) type contract.
Contracts can be either JSON or TypeScript files, with TypeScript being the preferred option.

### Sync integrations
Sync integrations should be placed within the `lib/integrations` directory of the plugin repo. The integation's filename should match the identifying slug of the integration.

### Actions
Actions should be placed within the `lib/actions` directory of the plugin repo. The action's filename should match the identifying slug of the action.

### Examples
For some real examples in use in production, check the following repositories:
- [jellyfish-plugin-front](https://github.com/product-os/jellyfish-plugin-front)
- [jellyfish-plugin-typeform](https://github.com/product-os/jellyfish-plugin-typeform)
- [jellyfish-plugin-discourse](https://github.com/product-os/jellyfish-plugin-discourse)
- [jellyfish-plugin-outreach](https://github.com/product-os/jellyfish-plugin-outreach)
- [jelyfish-plugin-github](https://github.com/product-os/jellyfish-plugin-github)
