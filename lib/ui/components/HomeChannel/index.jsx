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
	actionCreators,
	selectors
} from '../../core'

import HomeChannel from './HomeChannel'

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, [ 'channel', 'data', 'head', 'id' ])
	const user = selectors.getCurrentUser(state)
	return {
		channels: selectors.getChannels(state),
		codename: selectors.getAppCodename(state),
		orgs: selectors.getOrgs(state),
		tail: target ? selectors.getViewData(state, target) : null,
		mentions: selectors.getViewData(state, 'view-my-inbox'),
		uiState: selectors.getUIState(state),
		user,
		version: selectors.getAppVersion(state),
		viewNotices: selectors.getViewNotices(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'loadViewResults',
				'logout',
				'removeViewNotice',
				'setUIState',
				'streamView'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(HomeChannel)
