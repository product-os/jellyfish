import _ from 'lodash';
import { createLazyComponent } from '../../../components/SafeLazy';
import { LensContract } from '../../../types';

const LensRenderer = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-contract-table" */ './MilestoneGraph'),
);

const lens: LensContract = {
	slug: 'lens-milestone-graph',
	type: 'lens',
	version: '1.0.0',
	name: 'Graph of milestone dependencies',
	data: {
		renderer: LensRenderer,
		label: 'Milestone graph',
		icon: 'project-diagram',
		format: 'list',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'milestone@1.0.0',
					},
					slug: {
						type: 'string',
					},
				},
			},
		},
		queryOptions: {
			mask: (query: any) => {
				if (query.anyOf) {
					query.anyOf.push({
						$$links: {
							'is required by': {
								type: 'object',
								properties: {
									type: {
										const: 'milestone@1.0.0',
									},
								},
							},
						},
					});

					if (!_.some(query.anyOf, _.isBoolean)) {
						query.anyOf.push(true);
					}
				}

				return query;
			},
		},
	},
};

export default lens;
