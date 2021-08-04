/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators, selectors } from '../../../core';
import CRMTable from './CRMTable';

const SLUG = 'lens-crm-table';

const mapStateToProps = (state, ownProps) => {
	const allTypes = selectors.getTypes(state);
	const target = _.get(ownProps, ['channel', 'data', 'head', 'id']);
	return {
		user: selectors.getCurrentUser(state),
		activeLoop: selectors.getActiveLoop(state),
		allTypes,
		types: _.get(_.find(allTypes, ['slug', 'opportunity']), [
			'data',
			'schema',
			'properties',
			'data',
			'properties',
			'status',
			'enum',
		]),
		lensState: selectors.getLensState(state, SLUG, target),
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
	name: 'CRM table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CRMTable),
		label: 'CRM table',
		format: 'list',
		icon: 'table',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
					},
					type: {
						type: 'string',
						const: 'opportunity@1.0.0',
					},
					data: {
						type: 'object',
						properties: {
							status: {
								type: 'string',
							},
						},
						required: ['status'],
					},
				},
				required: ['data', 'type'],
			},
		},
	},
};

export default lens;
