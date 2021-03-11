/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	actionCreators,
	selectors
} from '../../../core'
import {
	createLazyComponent
} from '../../../components/SafeLazy'

// eslint-disable-next-line
const SupportAuditChartLazy = createLazyComponent(() => import(/* webpackChunkName: "support-audit-chart" */ './SupportAuditChart'))

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
	slug: 'lens-support-audit-chart',
	type: 'lens',
	version: '1.0.0',
	name: 'Support audit chart lens',
	data: {
		label: 'Support audit chart',
		icon: 'chart-bar',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportAuditChartLazy),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'support-thread@1.0.0'
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
			mask: (query) => {
				Reflect.deleteProperty(query, '$$links')
				return query
			},
			limit: 1000,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}

export default lens
