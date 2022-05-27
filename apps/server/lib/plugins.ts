import { balenaApiPlugin } from '@balena/jellyfish-plugin-balena-api';
import { channelsPlugin } from '@balena/jellyfish-plugin-channels';
import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { flowdockPlugin } from '@balena/jellyfish-plugin-flowdock';
import { frontPlugin } from '@balena/jellyfish-plugin-front';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { outreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { productOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { typeformPlugin } from '@balena/jellyfish-plugin-typeform';
import { oauthPlugin } from '@balena/jellyfish-plugin-oauth';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [
		productOsPlugin(),
		defaultPlugin(),
		channelsPlugin(),
		typeformPlugin(),
		githubPlugin(),
		flowdockPlugin(),
		discoursePlugin(),
		outreachPlugin(),
		frontPlugin(),
		balenaApiPlugin(),
		oauthPlugin(),
	];
}
