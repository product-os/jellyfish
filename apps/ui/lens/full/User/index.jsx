/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators
} from '../../../core'
import User from './User'

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'sendFirstTimeLoginLink',
				'createLink'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-full-user',
	type: 'lens',
	version: '1.0.0',
	name: 'User lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(null, mapDispatchToProps)(User),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0'
				}
			}
		}
	}
}

export default lens
