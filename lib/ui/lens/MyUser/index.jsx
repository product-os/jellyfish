/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	actionCreators,
	selectors
} from '../../core'
import MyUser from './MyUser'

const SLUG = 'lens-my-user'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(actionCreators, dispatch)
	}
}

export default {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(MyUser),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user'
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug'
					}
				}
			}
		}
	}
}
