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
import Contact from './Contact'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const lens = {
	slug: 'lens-snippet-contact',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps)(Contact),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'contact'
				}
			}
		}
	}
}

export default lens
