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
import Specification from './Specification'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const lens = {
	slug: 'lens-snippet-specification',
	type: 'lens',
	version: '1.0.0',
	name: 'Specification snippet',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps)(Specification),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'specification'
				}
			}
		}
	}
}

export default lens
