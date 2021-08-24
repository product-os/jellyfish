/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { PluginManager } from '@balena/jellyfish-plugin-base';
import { ChannelsPlugin } from '@balena/jellyfish-plugin-channels';
import ActionLibrary from '@balena/jellyfish-action-library';
import { DefaultPlugin } from '@balena/jellyfish-plugin-default';
import { ProductOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { TypeformPlugin } from '@balena/jellyfish-plugin-typeform';
import { GitHubPlugin } from '@balena/jellyfish-plugin-github';
import { FlowdockPlugin } from '@balena/jellyfish-plugin-flowdock';
import { DiscoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { OutreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { FrontPlugin } from '@balena/jellyfish-plugin-front';
import { BalenaAPIPlugin } from '@balena/jellyfish-plugin-balena-api';
import { getLogger } from '@balena/jellyfish-logger';

const logger = getLogger(__filename);

export const getPluginManager = (context) => {
	logger.info(context, 'Loading plugins');
	return new PluginManager(context, {
		plugins: [
			ActionLibrary,
			ProductOsPlugin,
			DefaultPlugin,
			ChannelsPlugin,
			TypeformPlugin,
			GitHubPlugin,
			FlowdockPlugin,
			DiscoursePlugin,
			OutreachPlugin,
			FrontPlugin,
			BalenaAPIPlugin,
		] as any[],
	});
};
