import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createLazyComponent } from '../../../components/SafeLazy';
import { actionCreators, selectors } from '../../../store';

export const ContractTable = createLazyComponent(
	() => import(/* webpackChunkName: "lens-contract-table" */ './UserTable'),
);

const SLUG = 'lens-table';

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, ['channel', 'data', 'head', 'id']);
	return {
		allTypes: selectors.getTypes()(state),
		activeLoop: selectors.getActiveLoop()(state),
		user: selectors.getCurrentUser()(state),
		lensState: selectors.getLensState(SLUG, target)(state),
		SLUG,
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'openCreateChannel',
				'createLink',
				'setLensState',
			]),
			dispatch,
		),
	};
};

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(ContractTable),
		label: 'Table',
		icon: 'table',
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
				// Include improvements the user owns or is dedicated to
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
				if (query.anyOf) {
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
				}

				return query;
			},
		},
	},
};

export default lens;
