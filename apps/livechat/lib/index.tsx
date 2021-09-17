/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
	BrowserRouter as Router,
	Redirect,
	Route,
	Switch,
} from 'react-router-dom';
import useEventListener from '@use-it/event-listener';
import { getSdk, JellyfishSDK } from '@balena/jellyfish-client-sdk';
import {
	Alert,
	NotificationsContainer,
	Provider as ThemeProvider,
} from 'rendition';
import { App } from '@balena/jellyfish-chat-widget';
import {
	Analytics,
	ErrorReporter,
	ErrorBoundary,
	SetupProvider,
} from '@balena/jellyfish-ui-components';
import { OauthCallbackTask } from './components/OauthCallbackTask';
import { AuthenticationTask } from './components/AuthenticationTask';
import * as environment from './environment';
import { slugify } from '@balena/jellyfish-ui-components/build/services/helpers';
declare const window: Window & { sdk: JellyfishSDK };

const Livechat = React.memo(
	({ userSlug, oauthUrl, oauthProvider, ...rest }: any) => {
		const analytics = React.useMemo(() => {
			return new Analytics({
				token: environment.analytics.mixpanel.token,
			});
		}, []);

		const sdk = React.useMemo(() => {
			window.sdk = getSdk({
				apiPrefix: environment.api.prefix,
				apiUrl: environment.api.url,
				authToken: localStorage.getItem('token') || undefined,
			});

			return window.sdk;
		}, []);

		const errorReporter = React.useMemo(() => {
			return new ErrorReporter({
				isProduction: environment.isProduction(),
				dsn: environment.sentry.dsn,
				version: environment.version,
			});
		}, []);

		const getErrorElement = React.useCallback(() => {
			return (
				<Alert p={3} justifyContent="center" plaintext danger>
					There was an error
				</Alert>
			);
		}, []);

		return (
			// @ts-ignore
			<SetupProvider
				environment={environment}
				sdk={sdk}
				analytics={analytics}
				errorReporter={errorReporter}
			>
				<ThemeProvider
					style={{
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<NotificationsContainer />
					<ErrorBoundary getErrorElement={getErrorElement}>
						<Router>
							<Switch>
								<Route
									path="/oauth/callback"
									exact
									render={(props) => {
										return (
											<OauthCallbackTask
												{...props}
												userSlug={userSlug}
												oauthProvider={oauthProvider}
											>
												{() => {
													return <Redirect to="/" />;
												}}
											</OauthCallbackTask>
										);
									}}
								/>
								<Route
									path="/"
									render={() => {
										return (
											<AuthenticationTask
												userSlug={userSlug}
												oauthUrl={oauthUrl}
											>
												{() => {
													return <App {...rest} sdk={sdk} />;
												}}
											</AuthenticationTask>
										);
									}}
								/>
							</Switch>
						</Router>
					</ErrorBoundary>
				</ThemeProvider>
			</SetupProvider>
		);
	},
);

const ParentWindowCommunicator = () => {
	const queryParams = React.useMemo(() => {
		const { state, ...rest } = Object.fromEntries(
			new URLSearchParams(location.search).entries(),
		);

		if (state) {
			return JSON.parse(state);
		}

		return rest;
	}, [location.search]);

	const { product, productTitle, username, inbox } = queryParams;

	const onClose = React.useCallback(() => {
		window.parent.postMessage(
			{
				type: 'close',
			},
			'*',
		);
	}, []);

	const onNotificationsChange = React.useCallback((notifications) => {
		window.parent.postMessage(
			{
				type: 'notifications-change',
				payload: {
					data: notifications,
				},
			},
			'*',
		);
	}, []);

	const [initialUrl, setInitialUrl] = React.useState();

	const handleMessage = React.useCallback(
		(event) => {
			if (!event.data) {
				return;
			}

			switch (event.data.type) {
				case 'navigate':
					setInitialUrl(event.data.payload);
					break;
				default:
					break;
			}
		},
		[setInitialUrl],
	);

	useEventListener('message', handleMessage, window);

	return (
		<Livechat
			product={product}
			productTitle={productTitle}
			inbox={inbox}
			userSlug={`user-${slugify(username)}`}
			oauthUrl={`https://dashboard.balena-cloud.com/login/oauth/jellyfish?state=${JSON.stringify(
				queryParams,
			)}`}
			oauthProvider={'balena-api'}
			initialUrl={initialUrl}
			onClose={onClose}
			onNotificationsChange={onNotificationsChange}
		/>
	);
};

/*
 * Init livechat.
 */
console.log('Initializing livechat:', location.href);

ReactDOM.render(<ParentWindowCommunicator />, document.getElementById('app'));
