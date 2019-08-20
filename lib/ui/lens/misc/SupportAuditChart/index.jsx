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
import SupportAuditChart from './SupportAuditChart'

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
		icon: 'chart-bar',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportAuditChart),
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					}
				}
			}
		},
		queryOptions: {
			mask: (query) => {
				Reflect.deleteProperty(query, '$$links')
				query.properties.data = {
					type: 'object',
					additionalProperties: true
				}

				return query
			},
			limit: 5000,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}
}

export default lens
