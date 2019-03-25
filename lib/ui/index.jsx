/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* global process */
/* eslint-disable no-process-env */

require('@babel/polyfill')
const Sentry = require('@sentry/browser')
const React = require('react')
const ReactDOM = require('react-dom')
const {
	Provider
} = require('react-redux')
const rendition = require('rendition')
const {
	injectGlobal
} = require('styled-components')
const core = require('./core')
const {
	JellyfishUI
} = require('./JellyfishUI')
const {
	ErrorBoundary
} = require('./shame/ErrorBoundary')

injectGlobal `
  * {
    box-sizing: border-box;
  }

  body {
    line-height: 1.5;
    margin: 0;
    font-family: ${rendition.Theme.font};
  }

	html,
	body,
	#app {
		height: 100%;
	}
`

const SENTRY_DSN = process.env.SENTRY_DSN_UI

if (process.env.NODE_ENV === 'production' &&
	SENTRY_DSN && SENTRY_DSN !== '0') {
	Sentry.init({
		dsn: SENTRY_DSN,
		release: process.env.VERSION,
		environment: 'ui'
	})
}

ReactDOM.render(
	(
		<Provider store={core.store}>
			<ErrorBoundary>
				<JellyfishUI />
			</ErrorBoundary>
		</Provider>
	),
	document.getElementById('app')
)
