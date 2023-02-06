import { balenaApiPlugin } from '@balena/jellyfish-plugin-balena-api';
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { frontPlugin } from '@balena/jellyfish-plugin-front';
import { githubPlugin } from '@balena/jellyfish-plugin-github';
import { incidentsPlugin } from '@balena/jellyfish-plugin-incidents';
import { outreachPlugin } from '@balena/jellyfish-plugin-outreach';
import { typeformPlugin } from '@balena/jellyfish-plugin-typeform';
import { feedbackPlugin } from '@balena/jellyfish-plugin-feedback';
import { PluginDefinition } from '@balena/jellyfish-worker';

export function getPlugins(): PluginDefinition[] {
	return [
		typeformPlugin(),
		githubPlugin(),
		discoursePlugin(),
		outreachPlugin(),
		frontPlugin(),
		balenaApiPlugin(),
		incidentsPlugin(),
		feedbackPlugin(),
	] as any;
}
