/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	withTheme
} from 'styled-components'
import {
	actionCreators,
	selectors
} from '../../core'
import {
	withResponsiveContext
} from '../../../../lib/ui-components/hooks/ResponsiveProvider'
import HomeChannel from './HomeChannel'

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
				'updateUser',
				'removeView',
				'setChatWidgetOpen',
				'setDefault',
				'setUIState',
				'setViewStarred',
				'streamView'
			]), dispatch)
	}
}

export default redux.compose(
	connect(mapStateToProps, mapDispatchToProps),
	withTheme,
	withResponsiveContext
)(HomeChannel)
