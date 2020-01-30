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
import Oauth from '@jellyfish/ui-components/Oauth'

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'authorizeIntegration',
				'setChannels'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Oauth)
