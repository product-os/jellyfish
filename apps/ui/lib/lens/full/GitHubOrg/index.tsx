import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';

export const RepositoryLens = createLazyComponent(
	() => import(/* webpackChunkName: "lens-check-run" */ './GitHubOrg'),
);

const lens = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: RepositoryLens,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'github-org@1.0.0',
				},
			},
		},
	},
};

export default lens;
