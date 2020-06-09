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
	Provider as ThemeProvider
} from 'rendition'
import {
	App
} from '../../lib/chat-widget'
import Analytics from '../../lib/ui-components/services/analytics'
import ErrorReporter from '../../lib/ui-components/services/error-reporter'
import ErrorBoundary from '../../lib/ui-components/shame/ErrorBoundary'
import {
	SetupProvider
} from '../../lib/ui-components/SetupProvider'
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
		return getSdk({
			apiPrefix: environment.api.prefix,
			apiUrl: environment.api.url,
			authToken: localStorage.getItem('token')
		})
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
				<ErrorBoundary getErrorElement={getErrorElement}>
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
