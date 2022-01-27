import { ActionLibrary } from '@balena/jellyfish-action-library';
import { getLogger } from '@balena/jellyfish-logger';
import { BalenaAPIPlugin } from '@balena/jellyfish-plugin-balena-api';
import { ChannelsPlugin } from '@balena/jellyfish-plugin-channels';
import { DefaultPlugin } from '@balena/jellyfish-plugin-default';
import { DiscoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { FlowdockPlugin } from '@balena/jellyfish-plugin-flowdock';
import { FrontPlugin } from '@balena/jellyfish-plugin-front';
import { GitHubPlugin } from '@balena/jellyfish-plugin-github';
import { OutreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { ProductOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { TypeformPlugin } from '@balena/jellyfish-plugin-typeform';
import { PluginManager } from '@balena/jellyfish-worker';

const logger = getLogger(__filename);

export const getPluginManager = (context) => {
	logger.info(context, 'Loading plugins');
	return new PluginManager([
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
	]);
};
