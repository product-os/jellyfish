import { balenaApiPlugin } from '@balena/jellyfish-plugin-balena-api';
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { frontPlugin } from '@balena/jellyfish-plugin-front';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [
		githubPlugin(),
		discoursePlugin(),
		frontPlugin(),
		balenaApiPlugin(),
	] as any;
}
