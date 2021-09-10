/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import '@babel/polyfill';
import { PersistGate } from 'redux-persist/integration/react';
import { MarkdownWidget as MarkdownEditor } from 'rendition/dist/extra/Form/markdown';
import { Provider } from 'react-redux';
import {
	Provider as RProvider,
	Theme,
	Rating,
	NotificationsContainer,
} from 'rendition';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createGlobalStyle } from 'styled-components';
import {
	AutoCompleteWidget,
	DocumentVisibilityProvider,
	ErrorBoundary,
	helpers,
	ResponsiveProvider,
	SetupProvider,
} from '@balena/jellyfish-ui-components';
import { analytics, errorReporter, sdk, persistor, store } from './core';
import history from './services/history';
import JellyfishUI from './JellyfishUI';
import { ConnectedRouter } from 'connected-react-router';
import * as environment from './environment';
import PWA from './pwa';
import { JellyfishWidgets, LoopSelectWidget } from './components/Widgets';
import MermaidEditor from './components/MermaidEditor';
import CountFavicon from './components/CountFavicon';
import CardLoaderContextProvider from './components/CardLoaderContextProvider';
import getHistory from "../lib/services/history";

export const pwa = new PWA();
pwa.init();

const GlobalStyle = createGlobalStyle`
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
		margin-bottom: ${(props) => {
			return helpers.px(props.theme.space[2]);
		}};
	}
	p:last-child {
		margin-bottom: 0;
	}
`;

const customTheme: any = {
	colors: {
		background: "#fff",
		border: "#eee",
	},
	tab: {
		// Keep tab height consistent with height of Select component
		extend: `${Theme.tab.extend}; height: 32px;`,
	},
};

const widgets: any = {
	form: {
		formats: [
			{
				name: "markdown",
				format: ".*",
				widget: MarkdownEditor,
			},
			{
				name: "mermaid",
				format: ".*",
				widget: MermaidEditor,
			},
			{
				name: "Rating",
				format: ".*",
				widget: Rating,
			},
			{
				name: "LoopSelect",
				format: ".*",
				widget: LoopSelectWidget,
			},
			{
				name: "AutoCompleteWidget",
				format: ".*",
				widget: AutoCompleteWidget,
			},
		],
	},
	renderer: {
		formats: JellyfishWidgets,
	},
};

ReactDOM.render(
	<RProvider
		theme={customTheme}
		widgets={widgets}
		style={{
			height: "100%",
			fontSize: 14,
		}}
		history={getHistory}
	>
		<ResponsiveProvider>
			<DocumentVisibilityProvider>
				<SetupProvider
					actions={{}}
					environment={environment}
					sdk={sdk}
					analytics={analytics}
					errorReporter={errorReporter}
				>
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
	</RProvider>,
	document.getElementById("app")
);
