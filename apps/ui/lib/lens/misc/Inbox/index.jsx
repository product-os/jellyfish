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
} from '../../../core'
import Inbox from './Inbox'

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(
		_.pick(actionCreators, [
			'setupStream',
			'clearViewData',
			'paginateStream'
		]),
		dispatch
	)
}

export default {
	slug: 'lens-inbox',
	type: 'lens',
	version: '1.0.0',
	name: 'Inbox lens',
	data: {
		format: 'inbox',
		renderer: connect(null, mapDispatchToProps)(Inbox),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object'
		}
	}
}
