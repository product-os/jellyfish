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

const Livechat = () => {
	const analytics = React.useMemo(() => {
		return new Analytics({
			token: environment.analytics.mixpanel.token
		})
	}, [])

	const sdk = React.useMemo(() => {
		const sdkInst = getSdk({
			apiPrefix: environment.api.prefix,
			apiUrl: environment.api.url,
			authToken: localStorage.getItem('token')
		})

		window.sdk = sdkInst
		return sdkInst
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

	const handleClose = React.useCallback(() => {
		window.top.postMessage({
			type: 'close'
		}, '*')
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
							<Route path="/oauth/callback" exact render={() => {
								return (
									<OauthCallbackTask>
										{(params) => {
											return (
												<Redirect to={`/?${new URLSearchParams(params).toString()}`} />
											)
										}}
									</OauthCallbackTask>
								)
							}} />
							<Route path="/" render={() => {
								return (
									<AuthenticationTask>
										{() => {
											const {
												product,
												productTitle,
												inbox
											} = Object.fromEntries(new URLSearchParams(location.search).entries())

											return (
												<App
													sdk={sdk}
													product={product}
													productTitle={productTitle}
													inbox={inbox}
													onClose={handleClose}
												/>
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

/*
 * Init livechat.
 */
console.log('Initializing livechat:', location.href)

ReactDOM.render((
	<Livechat />
), document.getElementById('app'))
