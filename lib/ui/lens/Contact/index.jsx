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
	actionCreators
} from '../../core'
import Contact from './Contact'

const mapStateToProps = (state, ownProps) => {
	return {}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
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
		renderer: connect(mapStateToProps, mapDispatchToProps)(Contact),
		filter: {
			type: 'object',
			properties: {
				data: {
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
	}
}

export default lens
