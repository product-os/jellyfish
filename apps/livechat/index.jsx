/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import {
	BrowserRouter as Router, Redirect, Route, Switch
} from 'react-router-dom'
import '@babel/polyfill'
import 'circular-std'
import {
	Provider as ThemeProvider
} from 'rendition'
import {
	App, createSdk
} from '../../lib/chat-widget'
import {
	OauthCallbackTask
} from './components/OauthCallbackTask'
import {
	AuthenticationTask
} from './components/AuthenticationTask'

const Livechat = ({
	userSlug,
	oauthUrl,
	oauthProvider,
	...rest
}) => {
	const sdk = React.useMemo(() => {
		return createSdk({
			authToken: localStorage.getItem('token')
		})
	}, [])

	return (
		<ThemeProvider style={{
			height: '100%', display: 'flex', flexDirection: 'column'
		}}>
			<Router>
				<Switch>
					<Route path="/oauth/callback" exact render={(props) => {
						return (
							<OauthCallbackTask {...props} userSlug={userSlug} sdk={sdk} oauthProvider={oauthProvider}>
								{() => {
									return (
										<Redirect to="/" />
									)
								}}
							</OauthCallbackTask>
						)
					}} />
					<Route path="/" render={() => {
						return (
							<AuthenticationTask userSlug={userSlug} sdk={sdk} oauthUrl={oauthUrl}>
								{() => {
									return (
										<App {...rest} sdk={sdk} />
									)
								}}
							</AuthenticationTask>
						)
					}} />
				</Switch>
			</Router>
		</ThemeProvider>
	)
}

const init = (options = {}) => {
	return new Promise((resolve) => {
		ReactDOM.render((
			<Livechat {...options} />
		), document.getElementById('app'), resolve)
	})
}

window.init = init

const actions = {
	async init (event) {
		const onClose = () => {
			event.source.postMessage({
				type: 'close'
			}, event.origin)
		}

		return init({
			...event.data.payload,
			onClose
		})
	}
}

const respond = (event, response) => {
	event.source.postMessage({
		type: 'response',
		payload: {
			request: event.data,
			...response
		}
	}, event.origin)
}

window.addEventListener('message', async (event) => {
	const action = event.data && event.data.type && actions[event.data.type]

	if (!action) {
		return null
	}

	let result = null
	try {
		result = await action(event)
	} catch (error) {
		return respond(event, {
			error
		})
	}

	return respond(event, {
		data: result
	})
})
