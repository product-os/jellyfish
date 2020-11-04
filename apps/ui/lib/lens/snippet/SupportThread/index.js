/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import _ from 'lodash'
import {
	selectors,
	actionCreators
} from '../../../core'
import SupportThread from './SupportThread'

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'getActor',
				'getCard'
			]),
			dispatch
		)
	}
}

const lens = {
	slug: 'lens-snippet-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support Thread snippet',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(SupportThread),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: [ 'support-thread@1.0.0', 'sales-thread@1.0.0' ]
				}
			}
		}
	}
}

export default lens
