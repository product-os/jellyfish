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
import Contact from './Contact'

const mapStateToProps = (state, ownProps) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'getLinks',
				'setTimelineMessage',
				'signalTyping'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-contact',
	type: 'lens',
	version: '1.0.0',
	name: 'Contact lens',
	data: {
		icon: 'address-card',
		format: 'full',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Contact),
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
