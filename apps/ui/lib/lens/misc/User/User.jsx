/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useDispatch, useSelector
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Route,
	Switch
} from 'react-router-dom'
import {
	Flex
} from 'rendition'
import {
	ChatWidgetSidebar
} from '../../../components/ChatWidgetSidebar'
import Sidebar from '../../../components/Sidebar'
import RouteHandler from '../../../components/RouteHandler'
import Oauth from '../../../components/Oauth'
import Login from '../../../components/Auth/Login'
import PageTitle from '../../../components/PageTitle'
import RequestPasswordReset from '../../../components/Auth/RequestPasswordReset'
import CompletePasswordReset from '../../../components/Auth/CompletePasswordReset'
import CompleteFirstTimeLogin from '../../../components/Auth/CompleteFirstTimeLogin'
import AuthContainer from '../../../components/Auth'
import {
	actionCreators,
	selectors
} from '../../../core'
import {
	name
} from '../../../manifest.json'

const useActions = () => {
	const dispatch = useDispatch()

	return bindActionCreators(
		actionCreators,
		dispatch
	)
}

const GuestUserScreen = () => {
	return (
		<AuthContainer>
			<Switch>
				<Route path='/request_password_reset' component={RequestPasswordReset} />
				<Route path='/password_reset/:resetToken/:username?' component={CompletePasswordReset} />
				<Route path='/first_time_login/:firstTimeLoginToken/:username?' component={CompleteFirstTimeLogin} />
				<Route path="/*" component={Login} />
			</Switch>
		</AuthContainer>
	)
}

const LoggedUserScreen = () => {
	const actions = useActions()
	const isChatWidgetOpen = useSelector(selectors.getChatWidgetOpen)

	const handleChatWidgetClose = React.useCallback(() => {
		actions.setChatWidgetOpen(false)
	}, [ actions.setChatWidgetOpen ])

	return (
		<React.Fragment>
			<Flex flex="1" style={{
				height: '100%'
			}}>
				<PageTitle siteName={name} />
				<Sidebar />

				<Switch>
					<Route path="/oauth/:integration" component={Oauth} />
					<Route path="/*" component={RouteHandler} />
				</Switch>
			</Flex>

			{isChatWidgetOpen && (
				<ChatWidgetSidebar
					onClose={handleChatWidgetClose}
				/>
			)}
		</React.Fragment>
	)
}

export const UserLens = ({
	card: user
}) => {
	if (user.slug === 'user-guest') {
		return (
			<GuestUserScreen />
		)
	}

	return (
		<LoggedUserScreen />
	)
}
