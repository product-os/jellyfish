/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators,
	selectors
} from '../../../core'
import CRMTable from './CRMTable'

const mapStateToProps = (state) => {
	const allTypes = selectors.getTypes(state)
	return {
		user: selectors.getCurrentUser(state),

		allTypes,
		types: _.get(
			_.find(allTypes, [ 'slug', 'opportunity' ]), [
				'data',
				'schema',
				'properties',
				'data',
				'properties',
				'status',
				'enum'
			]
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'createLink'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-crm-table',
	type: 'lens',
	version: '1.0.0',
	name: 'CRM table lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CRMTable),
		format: 'full',
		icon: 'table',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}
}

export default lens
