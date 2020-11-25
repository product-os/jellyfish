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
	selectors,
	sdk
} from '../../../core'
import CRMTable from './CRMTable'

const SLUG = 'lens-crm-table'

const mapStateToProps = (state, props) => {
	const target = _.get(props, [ 'channel', 'data', 'head', 'id' ])
	return {
		sdk,
		user: selectors.getCurrentUser(state),
		types: selectors.getTypes(state),
		statusTypes: _.get(
			_.find(selectors.getTypes(state), [ 'slug', 'opportunity' ]), [
				'data',
				'schema',
				'properties',
				'data',
				'properties',
				'status',
				'enum'
			]
		),
		lensState: selectors.getLensState(state, SLUG, target),
		SLUG
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'setLensState',
				'addNotification',
				'createLink',
				'setFlow',
				'queryAPI'
			]), dispatch)
	}
}

const lens = {
	slug: SLUG,
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
