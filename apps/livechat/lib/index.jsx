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
import {
	getSdk
} from '@balena/jellyfish-client-sdk'
import {
	Alert,
	NotificationsContainer,
	Provider as ThemeProvider
} from 'rendition'
import {
	App
} from '@balena/jellyfish-chat-widget'
import {
	Analytics,
	ErrorReporter,
	ErrorBoundary,
	SetupProvider
} from '@balena/jellyfish-ui-components'
import {
	OauthCallbackTask
} from './components/OauthCallbackTask'
import {
	AuthenticationTask
} from './components/AuthenticationTask'
import * as environment from './environment'

const Livechat = ({
	userSlug,
	oauthUrl,
	oauthProvider,
	...rest
}) => {
	const analytics = React.useMemo(() => {
		return new Analytics({
			token: environment.analytics.mixpanel.token
		})
	}, [])

	const sdk = React.useMemo(() => {
		window.sdk = getSdk({
			apiPrefix: environment.api.prefix,
			apiUrl: environment.api.url,
			authToken: localStorage.getItem('token')
		})

		return window.sdk
	}, [])

	const errorReporter = React.useMemo(() => {
		return new ErrorReporter({
			isProduction: environment.isProduction(),
			dsn: environment.sentry.dsn,
			version: environment.version
		})
	}, [])

	const getErrorElement = React.useCallback(() => {
		return (
			<Alert p={3} justifyContent="center" plaintext danger>There was an error</Alert>
		)
	}, [])

	return (
		<SetupProvider
			environment={environment}
			sdk={sdk}
			analytics={analytics}
			errorReporter={errorReporter}>
			<ThemeProvider style={{
				height: '100%', display: 'flex', flexDirection: 'column'
			}}>
				<NotificationsContainer />
				<ErrorBoundary getErrorElement={getErrorElement}>
					<Router>
						<Switch>
							<Route path="/oauth/callback" exact render={(props) => {
								return (
									<OauthCallbackTask {...props} userSlug={userSlug} oauthProvider={oauthProvider}>
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
									<AuthenticationTask userSlug={userSlug} oauthUrl={oauthUrl}>
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
				</ErrorBoundary>
			</ThemeProvider>
		</SetupProvider>
	)
}

const init = (options = {}) => {
	return new Promise((resolve) => {
		ReactDOM.render((
			<Livechat {...options} />
		), document.getElementById('app'), resolve)
	})
}

const actions = {
	async init (event) {
		const onClose = () => {
			event.source.postMessage({
				type: 'close'
			}, event.origin)
		}

		const onNotificationsChange = (notifications) => {
			event.source.postMessage({
				type: 'notifications-change',
				payload: {
					data: notifications
				}
			}, event.origin)
		}

		return init({
			...event.data.payload,
			onClose,
			onNotificationsChange
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
