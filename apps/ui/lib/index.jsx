/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '@babel/polyfill'
import React from 'react'
import ReactDOM from 'react-dom'
import {
	PersistGate
} from 'redux-persist/integration/react'
import {
	Provider
} from 'react-redux'
import {
	Provider as RProvider,
	Theme,
	NotificationsContainer,
	Rating
} from 'rendition'
import {
	MarkdownWidget
} from 'rendition/dist/extra/Form/markdown'
import MermaidEditor from './components/MermaidEditor'
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
	DocumentVisibilityProvider,
	ErrorBoundary,
	helpers,
	ResponsiveProvider,
	SetupProvider
} from '@balena/jellyfish-ui-components'
import {
	analytics,
	errorReporter,
	sdk,
	persistor,
	store
} from './core'
import history from './services/history'
import JellyfishUI from './JellyfishUI'
import {
	ConnectedRouter
} from 'connected-react-router'
import * as environment from './environment'
import PWA from './pwa'
import CountFavicon from './components/CountFavicon'
import CardLoaderContextProvider from './components/CardLoaderContextProvider'

// Register the mermaid and markdown widgets for rendition forms
// Register the extra format widgets to the Form component
const RENDITION_WIDGETS = {
	form: {
		formats: [
			{
				name: 'markdown',
				format: '.*',
				widget: MarkdownWidget
			},
			{
				name: 'mermaid',
				format: '.*',
				widget: MermaidEditor
			},
			{
				name: 'Rating',
				format: '.*',
				widget: Rating
			}
		]
	}
}

export const pwa = new PWA()
pwa.init()

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

	p {
		margin-top: 0;
		margin-bottom: ${(props) => { helpers.px(props.theme.space[2]) }};
	}
	p:last-child {
		margin-bottom: 0;
	}
`

const customTheme = {
	colors: {
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
			widgets={RENDITION_WIDGETS}
		>
			<ResponsiveProvider>
				<DocumentVisibilityProvider>
					<SetupProvider environment={environment} sdk={sdk} analytics={analytics} errorReporter={errorReporter}>
						<Provider store={store}>
							<PersistGate loading={null} persistor={persistor}>
								<CardLoaderContextProvider>
									<ConnectedRouter history={history}>
										<GlobalStyle />
										<CountFavicon />
										<NotificationsContainer />
										<ErrorBoundary>
											<DndProvider backend={HTML5Backend}>
												<JellyfishUI />
											</DndProvider>
										</ErrorBoundary>
									</ConnectedRouter>
								</CardLoaderContextProvider>
							</PersistGate>
						</Provider>
					</SetupProvider>
				</DocumentVisibilityProvider>
			</ResponsiveProvider>
		</RProvider>
	),
	document.getElementById('app')
)
