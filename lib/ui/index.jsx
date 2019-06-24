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
		<Provider store={store}>
			<React.Fragment>
				<GlobalStyle />

				<ErrorBoundary>
					<JellyfishUI />
				</ErrorBoundary>
			</React.Fragment>
		</Provider>
	),
	document.getElementById('app')
)
