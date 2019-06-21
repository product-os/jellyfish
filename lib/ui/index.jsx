/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

require('@babel/polyfill')
const Sentry = require('@sentry/browser')
require('circular-std')
const React = require('react')
const ReactDOM = require('react-dom')
const {
	Provider
} = require('react-redux')
const {
	Theme
} = require('rendition')
const {
	createGlobalStyle
} = require('styled-components')

const core = require('./core')
const JellyfishUI = require('./JellyfishUI').default
const ErrorBoundary = require('./shame/ErrorBoundary')
const environment = require('./environment')

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
		<Provider store={core.store}>
			<React.Fragment>
				<GlobalStyle />

				<ErrorBoundary.default>
					<JellyfishUI />
				</ErrorBoundary.default>
			</React.Fragment>
		</Provider>
	),
	document.getElementById('app')
)
