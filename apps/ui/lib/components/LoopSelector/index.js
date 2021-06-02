/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	withRouter
} from 'react-router-dom'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators,
	compose
} from 'redux'
import {
	actionCreators,
	selectors
} from '../../core'
import {
	LoopSelector
} from './LoopSelector'

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
		loops: selectors.getLoops(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'setActiveLoop'
			]), dispatch)
	}
}

export default compose(
	withRouter,
	connect(mapStateToProps, mapDispatchToProps)
)(LoopSelector)
