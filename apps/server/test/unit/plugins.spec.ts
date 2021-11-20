import { v4 as uuid } from 'uuid';
import { cardMixins } from '@balena/jellyfish-core';
import { getPluginManager } from '../../lib/plugins';

const context = {
	id: `UNIT-TEST-${uuid()}`,
};

test('Plugin Manager loads plugins', () => {
	const pluginManager = getPluginManager(context);

	const cards = pluginManager.getCards(context, cardMixins);
	expect(cards.account.slug).toBe('account');

	const integrations = pluginManager.getSyncIntegrations(context);
	expect(integrations.front.slug).toBe('front');
});
