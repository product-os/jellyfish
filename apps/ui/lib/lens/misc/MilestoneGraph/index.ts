import _ from 'lodash';
import { connect } from 'react-redux';
import { selectors } from '../../../core';
import { createLazyComponent } from '../../../components/SafeLazy';
import { LensContract } from '../../../types';
import type { StateProps, OwnProps } from './MilestoneGraph';

const LensRenderer = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-contract-table" */ './MilestoneGraph'),
);

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes(state),
	};
};

const lens: LensContract = {
	slug: 'lens-milestone-graph',
	type: 'lens',
	version: '1.0.0',
	name: 'Graph of milestone dependencies',
	data: {
		renderer: connect<StateProps, {}, OwnProps>(mapStateToProps)(LensRenderer),
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
