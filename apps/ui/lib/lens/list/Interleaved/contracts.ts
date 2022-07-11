import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { withDefaultGetActorHref } from '../../../components';
import { selectors } from '../../../store';
import { withChannelContext } from '../../../hooks';
import type { LensContract, LensRendererProps } from '../../../types';
import type { OwnProps, StateProps } from './component';
import { InterleavedList } from './component';

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes()(state),
		groups: selectors.getGroups()(state),
		user: selectors.getCurrentUser()(state),
	};
};

export const lens: LensContract = {
	slug: 'lens-interleaved',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		label: 'Interleaved',
		icon: 'list',
		format: 'list',
		renderer: compose<React.ComponentType<LensRendererProps>>(
			withRouter,
			withChannelContext,
			withDefaultGetActorHref(),
			connect<StateProps, {}, OwnProps>(mapStateToProps),
		)(InterleavedList),
		filter: {
			type: 'array',
			oneOf: [
				{
					items: {
						type: 'object',
						required: ['id', 'type', 'slug'],
						properties: {
							id: {
								type: 'string',
							},
							slug: {
								type: 'string',
							},
							type: {
								type: 'string',
								const: 'thread@1.0.0',
							},
						},
					},
				},
				{
					items: {
						type: 'object',
						required: ['id', 'type', 'data'],
						properties: {
							id: {
								type: 'string',
							},
							slug: {
								type: 'string',
							},
							type: {
								type: 'string',
								const: 'message@1.0.0',
							},
							data: {
								type: 'object',
								properties: {
									timestamp: {
										type: 'string',
										format: 'date-time',
									},
									actor: {
										type: 'string',
										format: 'uuid',
									},
									payload: {
										type: 'object',
										properties: {
											message: {
												type: 'string',
											},
										},
									},
								},
								required: ['timestamp', 'actor', 'payload'],
							},
						},
					},
				},
			],
		},
		queryOptions: {
			limit: 30,
			sortBy: 'created_at',
			sortDir: 'desc',
			// The interleaved lens is interested in messages that are attached to the
			// main query resource. Here we invert the query so that we retrieve all
			// the messages attached to the main queried resource
			mask: (query) => {
				return {
					type: 'object',
					$$links: {
						'is attached to': query,
					},
					properties: {
						active: {
							const: true,
							type: 'boolean',
						},
						type: {
							type: 'string',
							const: 'message@1.0.0',
						},
					},
					required: ['active', 'type'],
				};
			},
		},
	},
};
