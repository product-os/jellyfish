import { balenaApiPlugin } from '@balena/jellyfish-plugin-balena-api';
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { feedbackPlugin } from '@balena/jellyfish-plugin-feedback';
import { frontPlugin } from '@balena/jellyfish-plugin-front';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { incidentsPlugin } from '@balena/jellyfish-plugin-incidents';
import { outreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [
		feedbackPlugin(),
		githubPlugin(),
		discoursePlugin(),
		outreachPlugin(),
		frontPlugin(),
		balenaApiPlugin(),
		incidentsPlugin(),
	] as any;
}
