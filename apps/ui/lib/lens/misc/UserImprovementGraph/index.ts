import _ from 'lodash';
import { connect } from 'react-redux';
import { createLazyComponent } from '../../../components/SafeLazy';

export const UserImprovementGraph = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "lens-contract-table" */ './UserImprovementGraph'
		),
);

const lens = {
	slug: 'lens-user-improvement-graph',
	type: 'lens',
	version: '1.0.0',
	name: 'User improvement graph',
	data: {
		renderer: UserImprovementGraph,
		label: 'Improvement graph',
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
						const: 'user@1.0.0',
					},
					links: {
						type: 'object',
						properties: {
							'is member of': {
								type: 'array',
							},
						},
					},
				},
			},
		},
		queryOptions: {
			limit: 300,
			mask: (query: any) => {
				// Include improvements the user is a part of
				const improvementQuery = {
					type: 'object',
					properties: {
						type: {
							const: 'improvement@1.0.0',
						},
						data: {
							type: 'object',
							properties: {
								// Don't include finished improvements
								status: {
									not: {
										enum: ['denied-or-failed', 'completed'],
									},
								},
							},
						},
					},
				};
				if (!query.anyOf) {
					query.anyOf = [];
				}
				query.anyOf.push({
					anyOf: [
						{
							$$links: {
								'is dedicated to': improvementQuery,
							},
						},
						{
							$$links: {
								owns: improvementQuery,
							},
						},
						{
							$$links: {
								'contributes to': improvementQuery,
							},
						},
						{
							$$links: {
								guides: improvementQuery,
							},
						},
						true,
					],
				});

				if (!_.some(query.anyOf, _.isBoolean)) {
					query.anyOf.push(true);
				}

				return query;
			},
		},
	},
};

export default lens;
