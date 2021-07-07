/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { v4 as uuid } from 'uuid';
import { cardMixins } from '@balena/jellyfish-core';
import { getPluginManager } from '../../lib/plugins';
import { core } from '@balena/jellyfish-types';

const context: core.Context = {
	id: `UNIT-TEST-${uuid()}`,
};

describe('Plugin Manager', () => {
	test('loads plugins', () => {
		const pluginManager = getPluginManager(context);

		const cards = pluginManager.getCards(context, cardMixins);
		expect(cards.account.slug).toBe('account');

		const integrations = pluginManager.getSyncIntegrations(context);
		expect(integrations.front.slug).toBe('front');
	});
});
