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
import RequestPasswordReset from './RequestPasswordReset'

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'requestPasswordReset'
			]), dispatch)
	}
}

export default connect(null, mapDispatchToProps)(RequestPasswordReset)
