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
import CreateUserLens from './CreateUserLens'

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'removeChannel',
				'addUser'
			]),
			dispatch
		)
	}
}

export default {
	slug: 'lens-action-create-user',
	type: 'lens',
	version: '1.0.0',
	name: 'Create user lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CreateUserLens),
		icon: 'address-card',
		type: '*',
		action: {
			type: 'string',
			const: 'create'
		},
		filter: {
			type: 'object',
			required: [ 'types' ],
			properties: {
				types: {
					type: 'object',
					required: [ 'slug' ],
					properties: {
						slug: {
							type: 'string',
							const: 'user'
						}
					}
				}
			}
		}
	}
}
