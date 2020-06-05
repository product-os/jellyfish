/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Flex
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import {
	MarkdownWidget
} from 'rendition/dist/extra/Form/markdown'
import {
	saveAs
} from 'file-saver'
import {
	ChatWidgetSidebar
} from '../../lib/ui-components/ChatWidgetSidebar'
import HomeChannel from './components/HomeChannel'
import Notifications from './components/HOC/Notifications'
import RouteHandler from './components/RouteHandler'
import Oauth from './components/HOC/Oauth'
import Login from './components/HOC/Login'
import CountFavicon from './components/CountFavicon'
import RequestPasswordReset from './components/HOC/RequestPasswordReset'
import CompletePasswordReset from './components/HOC/CompletePasswordReset'
import CompleteFirstTimeLogin from './components/HOC/CompleteFirstTimeLogin'
import Inbox from './components/Inbox'
import MermaidEditor from '../../lib/ui-components/shame/MermaidEditor'
import Splash from '../../lib/ui-components/Splash'
import AuthContainer from '../../lib/ui-components/Auth'
import {
	actionCreators,
	selectors
} from './core'
import {
	Route,
	Redirect,
	Switch
} from 'react-router-dom'

// Register the mermaid and markdown widgets for rendition forms
// Register the extra format widgets to the Form component
Form.registerWidget('markdown', MarkdownWidget)
Form.registerWidget('mermaid', MermaidEditor)

// Check if the path begins with a hash fragment, followed by a slash: /#/ OR
// A path that begins with a type and a tilde
const LEGACY_PATH_CHECK_RE = /^\/(#\/|[a-z-].+~)/
const isLegacyPath = (path) => {
	if (path.match(LEGACY_PATH_CHECK_RE)) {
		return true
	}

	return false
}

// Removes # fragment prefix and type prefixes for a url path
const LEGACY_PATH_REPLACE_RE = /(^\/#\/|[a-z-]+~)/g
const transformLegacyPath = (path) => {
	return path.replace(LEGACY_PATH_REPLACE_RE, '')
}

class JellyfishUI extends React.Component {
	constructor (props) {
		super(props)

		// Add a utility to the window to dump the core state, this is useful for
		// debugging
		window.dumpState = async () => {
			const state = await this.props.actions.dumpState()

			const blob = new Blob(
				[ JSON.stringify(state) ],
				{
					type: 'application/json;charset=utf-8'
				}
			)

			saveAs(blob, `jellyfish-ui-dump__${new Date().toISOString()}.json`)
		}

		this.handleChatWidgetClose = () => {
			this.props.actions.setChatWidgetOpen(false)
		}
	}

	render () {
		const path = window.location.pathname + window.location.hash

		if (this.props.status === 'initializing') {
			return <Splash />
		}
		if (this.props.status === 'unauthorized') {
			return (
				<AuthContainer>
					<Switch>
						<Route path='/request_password_reset' component={RequestPasswordReset} />
						<Route path='/password_reset/:resetToken/:username?' component={CompletePasswordReset} />
						<Route path='/first_time_login/:firstTimeLoginToken/:username?' component={CompleteFirstTimeLogin} />
						<Route path="/*" component={Login} />
					</Switch>
					<Notifications />
				</AuthContainer>
			)
		}
		const [ home ] = this.props.channels

		return (
			<React.Fragment>
				{isLegacyPath(path) && (
					<Redirect to={transformLegacyPath(path)} />
				)}

				<Flex flex="1" style={{
					height: '100%'
				}}>
					<CountFavicon baseIcon="/icons/jellyfish.svg" />
					<HomeChannel channel={home}/>

					<Switch>
						<Route path="/oauth/:integration" component={Oauth} />
						<Route path="/inbox" component={Inbox} />
						<Route path="/*" component={RouteHandler} />
					</Switch>
				</Flex>

				{this.props.isChatWidgetOpen && (
					<ChatWidgetSidebar
						onClose={this.handleChatWidgetClose}
					/>
				)}

				<Notifications />
			</React.Fragment>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
		version: selectors.getAppVersion(state),
		isChatWidgetOpen: selectors.getChatWidgetOpen(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'dumpState',
				'setChatWidgetOpen'
			]), dispatch)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(JellyfishUI)
