/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	actionCreators
} from '../../core'

import AuthenticatedImage from './AuthenticatedImage'

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'getFile',
				'addNotification'
			]), dispatch)
	}
}

export default connect(null, mapDispatchToProps)(AuthenticatedImage)
