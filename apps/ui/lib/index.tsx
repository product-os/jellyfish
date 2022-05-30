import React from 'react';
import ReactDOM from 'react-dom';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import reduxThunk from 'redux-thunk';
import { persistStore } from 'redux-persist';
import {
	Provider as RProvider,
	Theme,
	Rating,
	NotificationsContainer,
} from 'rendition';
import { DndProvider } from 'react-dnd';
import * as redux from 'redux';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createGlobalStyle } from 'styled-components';
import { AutoCompleteWidget, ErrorBoundary, SetupProvider } from './components';
import { ResponsiveProvider } from './hooks/use-responsive-context';
import { DocumentVisibilityProvider } from './hooks/use-document-visibility';
import * as helpers from './services/helpers';
import history from './services/history';
import JellyfishUI from './JellyfishUI';
import { ConnectedRouter, routerMiddleware } from 'connected-react-router';
import * as environment from './environment';
import { JellyfishWidgets, LoopSelectWidget } from './components/Widgets';
import CountFavicon from './components/CountFavicon';
import CardLoaderContextProvider from './components/CardLoaderContextProvider';
import { createLazyComponent } from './components/SafeLazy';
import { getSdk } from '@balena/jellyfish-client-sdk';
import Analytics from './services/analytics';
import ErrorReporter from './services/error-reporter';
import { reducer } from './store/reducer';
import { actionCreators, selectors } from './store';

export const MarkdownEditor = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "markdown-editor" */ './components/MarkdownEditor'
		),
);

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
		background: '#fff',
		border: '#eee',
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
				name: 'markdown',
				format: '.*',
				widget: MarkdownEditor,
			},
			{
				name: 'mermaid',
				format: '.*',
				widget: MarkdownEditor,
			},
			{
				name: 'Rating',
				format: '.*',
				widget: Rating,
			},
			{
				name: 'LoopSelect',
				format: '.*',
				widget: LoopSelectWidget,
			},
			{
				name: 'AutoCompleteWidget',
				format: '.*',
				widget: AutoCompleteWidget,
			},
		],
	},
	renderer: {
		formats: JellyfishWidgets,
	},
};

const App = () => {
	const sdk = React.useMemo(() => {
		return getSdk({
			apiPrefix: environment.api.prefix,
			apiUrl: environment.api.url,
		});
	}, []);

	(window as any).sdk = sdk;

	const analytics = React.useMemo(() => {
		return new Analytics({
			token: environment.analytics.mixpanel.token,
		});
	}, []);

	const errorReporter = React.useMemo(() => {
		return new ErrorReporter({
			isProduction: environment.isProduction(),
			dsn: environment.sentry.dsn,
			version: environment.version,
		});
	}, []);

	const store = React.useMemo(() => {
		const middleware = [
			routerMiddleware(history),
			reduxThunk.withExtraArgument({
				sdk,
				analytics,
				errorReporter,
			}),
		];

		const composeEnhancers =
			(typeof window !== 'undefined' &&
				!environment.isProduction() &&
				// eslint-disable-next-line no-underscore-dangle
				(window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
			redux.compose;

		return redux.createStore(
			reducer,
			composeEnhancers(redux.applyMiddleware(...middleware)),
		);
	}, [sdk, analytics, errorReporter]);

	const persistor = React.useMemo(() => {
		const onHydrated = async () => {
			const token = selectors.getSessionToken()(store.getState());
			try {
				if (token) {
					await store.dispatch(actionCreators.loginWithToken(token) as any);
				} else {
					await store.dispatch(actionCreators.setStatus('unauthorized') as any);
				}
			} catch (error) {
				console.error(error);
			}
		};

		return persistStore(store, null, onHydrated);
	}, [store]);

	return (
		<RProvider
			theme={customTheme}
			widgets={widgets}
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				fontSize: 14,
			}}
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
		</RProvider>
	);
};

ReactDOM.render(<App />, document.getElementById('app'));

/*
 * Delete existing service workers
 */
(async () => {
	if ('serviceWorker' in navigator) {
		try {
			const registrations = await navigator.serviceWorker.getRegistrations();

			await Promise.all(
				registrations.map(async (registration) => {
					return registration.unregister();
				}),
			);
		} catch (err) {
			console.log('Service worker unregistration failed:', err);
		}
	}
})();
