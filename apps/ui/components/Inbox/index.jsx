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
import Inbox from './Inbox'

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(
		_.pick(actionCreators, [
			'setupStream',
			'paginateStream'
		]),
		dispatch
	)
}

export default connect(null, mapDispatchToProps)(Inbox)
