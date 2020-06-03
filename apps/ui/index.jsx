/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '@babel/polyfill'
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
	DndProvider
} from 'react-dnd'
import {
	HTML5Backend
} from 'react-dnd-html5-backend'
import {
	createGlobalStyle
} from 'styled-components'
import {
	analytics,
	errorReporter,
	sdk,
	store
} from './core'
import history from './services/history'
import JellyfishUI from './JellyfishUI'
import ErrorBoundary from '../../lib/ui-components/shame/ErrorBoundary'
import {
	ResponsiveProvider
} from '../../lib/ui-components/hooks/ResponsiveProvider'
import {
	ConnectedRouter
} from 'connected-react-router'
import {
	SetupProvider
} from '../../lib/ui-components/SetupProvider'
import * as environment from './environment'
import pwa from './pwa'

pwa.init({
	debugServiceWorker: environment.pwa.debugSW(),
	enableWebPush: environment.pwa.enableWebPush
})

const GlobalStyle = createGlobalStyle `
  * {
    box-sizing: border-box;
  }

  body {
    line-height: 1.5;
    margin: 0;
		font-family: ${Theme.font};
		height: 100%;
		min-height: fill-available;
  }

	html,
	#app {
		height: 100%;
	}

	textarea,
	input {
		line-height: 1.5;
    font-family: ${Theme.font};
  }
`

const customTheme = {
	colors: {
		text: {
			main: Theme.colors.secondary.main,
			light: Theme.colors.secondary.light,
			dark: Theme.colors.secondary.dark
		},
		background: '#fff',
		border: '#eee'
	}
}

ReactDOM.render(
	(
		<RProvider
			theme={customTheme}
			style={{
				height: '100%',
				fontSize: 14
			}}
		>
			<ResponsiveProvider>
				<SetupProvider environment={environment} sdk={sdk} analytics={analytics} errorReporter={errorReporter}>
					<Provider store={store}>
						<ConnectedRouter history={history}>
							<GlobalStyle />

							<ErrorBoundary>
								<DndProvider backend={HTML5Backend}>
									<JellyfishUI />
								</DndProvider>
							</ErrorBoundary>
						</ConnectedRouter>
					</Provider>
				</SetupProvider>
			</ResponsiveProvider>
		</RProvider>
	),
	document.getElementById('app')
)
