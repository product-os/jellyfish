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
}	from '../../../core'
import TeardownFlowPanel from './TeardownFlowPanel'

const mapDispatchToProps = (dispatch, ownProps) => {
	const teardownActions = bindActionCreators(
		_.pick(actionCreators, [
			'addChannel',
			'createLink',
			'getLinks'
		]),
		dispatch
	)
	return {
		actions: Object.assign({}, ownProps.actions, teardownActions)
	}
}

export default connect(null, mapDispatchToProps)(TeardownFlowPanel)
