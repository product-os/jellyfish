/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	actionCreators,
	selectors
} from '../../../core'
import SupportThreadsToAudit, {
	SLUG
} from './SupportThreadsToAudit'

const mapStateToProps = (state, ownProps) => {
	return {
		channels: selectors.getChannels(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'getActor'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'SupportThreads lens',
	data: {
		label: 'Support/sales threads to audit',
		icon: 'address-card',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThreadsToAudit),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					},
					type: {
						type: 'string',
						enum: [
							'support-thread@1.0.0',
							'sales-thread@1.0.0'
						]
					},
					data: {
						type: 'object',
						properties: {
							status: {
								type: 'string',
								const: 'closed'
							}
						},
						required: [
							'status'
						]
					}
				},
				required: [
					'type',
					'data'
				]
			}
		},
		queryOptions: {
			limit: 30,
			sortBy: [ 'updated_at' ],
			sortDir: 'desc'
		}
	}
}

export default lens
