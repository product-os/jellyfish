import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [githubPlugin(), discoursePlugin()] as any;
}
