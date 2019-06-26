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
import SingleCard from './SingleCard'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const lens = {
	slug: 'lens-snippet-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps)(SingleCard),
		filter: {
			type: 'object'
		}
	}
}

export default lens
