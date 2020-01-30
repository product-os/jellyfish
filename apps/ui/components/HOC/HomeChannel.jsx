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

import HomeChannel from '@jellyfish/ui-components/HomeChannel'

const mapStateToProps = (state, ownProps) => {
	const target = _.get(ownProps, [ 'channel', 'data', 'head', 'id' ])
	const user = selectors.getCurrentUser(state)
	return {
		channels: selectors.getChannels(state),
		codename: selectors.getAppCodename(state),
		orgs: selectors.getOrgs(state),
		tail: target ? selectors.getViewData(state, target) : null,
		types: selectors.getTypes(state),
		mentions: selectors.getViewData(state, 'view-my-inbox'),
		subscriptions: selectors.getSubscriptions(state),
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
				'addChannel',
				'loadViewResults',
				'logout',
				'removeViewNotice',
				'setChatWidgetOpen',
				'setDefault',
				'setUIState',
				'streamView'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(HomeChannel)
