import { balenaApiPlugin } from '@balena/jellyfish-plugin-balena-api';
import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { flowdockPlugin } from '@balena/jellyfish-plugin-flowdock';
import { frontPlugin } from '@balena/jellyfish-plugin-front';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { outreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { typeformPlugin } from '@balena/jellyfish-plugin-typeform';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [
		defaultPlugin(),
		typeformPlugin(),
		githubPlugin(),
		flowdockPlugin(),
		discoursePlugin(),
		outreachPlugin(),
		frontPlugin(),
		balenaApiPlugin(),
	];
}
