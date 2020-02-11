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
} from '../../core'
import {
	getLens
} from '../../lens'
import RouteHandler from '../../../../lib/ui-components/RouteHandler'

const mapStateToProps = (state) => {
	return {
		getLens,
		types: selectors.getTypes(state),
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'setChannels',
				'addNotification',
				'queryAPI',
				'createLink'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(RouteHandler)
