/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	selectors
} from '../../../core'
import SingleResponse from './SingleResponse'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const lens = {
	slug: 'lens-snippet-form-response',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps)(SingleResponse),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: [ 'form-response@1.0.0', 'user-feedback@1.0.0' ]
				}
			}
		}
	}
}

export default lens
