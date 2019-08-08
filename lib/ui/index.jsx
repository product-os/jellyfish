/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '@babel/polyfill'
import * as Sentry from '@sentry/browser'
import 'circular-std'
import React from 'react'
import ReactDOM from 'react-dom'
import {
	Provider
} from 'react-redux'
import {
	Provider as RProvider,
	Theme
} from 'rendition'
import {
	createGlobalStyle
} from 'styled-components'
import {
	store
} from './core'
import JellyfishUI from './JellyfishUI'
import ErrorBoundary from './shame/ErrorBoundary'
import * as environment from './environment'
import {
	BrowserRouter as Router
} from 'react-router-dom'

if (environment.isProduction() && environment.sentry.dsn !== '0') {
	Sentry.init({
		dsn: environment.sentry.dsn,
		release: environment.version,
		environment: 'ui'
	})
}

const GlobalStyle = createGlobalStyle `
  * {
    box-sizing: border-box;
  }

  body {
    line-height: 1.5;
    margin: 0;
    font-family: ${Theme.font};
  }

	html,
	body,
	#app {
		height: 100%;
	}

	textarea,
	input {
		line-height: 1.5;
    font-family: ${Theme.font};
  }
`

ReactDOM.render(
	(
		<Router>
			<RProvider
				style={{
					height: '100%',
					fontSize: 14
				}}
			>
				<Provider store={store}>
					<React.Fragment>
						<GlobalStyle />

						<ErrorBoundary>
							<JellyfishUI />
						</ErrorBoundary>
					</React.Fragment>
				</Provider>
			</RProvider>
		</Router>
	),
	document.getElementById('app')
)
