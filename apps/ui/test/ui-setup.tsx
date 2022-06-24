import React from 'react';
import _ from 'lodash';
import { Provider } from 'rendition';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Provider as ReduxProvider } from 'react-redux';
import { configure } from 'enzyme';
import sinon from 'sinon';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Note: importing CardLoaderContext from the root of
// jellyfish-ui-components results in errors for the 'emotion'
// package. So instead we import directly from the CardLoader file.
import { CardLoaderContext } from '../lib/components/CardLoader';

import Adapter from 'enzyme-adapter-react-16';
import { SetupProvider } from '../lib/components/SetupProvider';
import type {
	Contract,
	ContractDefinition,
} from '@balena/jellyfish-types/build/core';
import { v4 as uuid } from 'uuid';
import { waitFor } from '@testing-library/react';

const emotionCache = createCache({
	key: 'test',
});

configure({
	adapter: new Adapter(),
});

const middlewares: any[] = [];
const mockStore = configureStore(middlewares);

class HowlerGlobal {}
// @ts-ignore
global.HowlerGlobal = HowlerGlobal;

class Howl {}
// @ts-ignore
global.Howl = Howl;

class Sound {}
// @ts-ignore
global.Sound = Sound;

class Location {}
// @ts-ignore
global.location = Location;

// eslint-disable-next-line no-undef
window.HTMLElement.prototype.scrollIntoView = _.noop;
window.scrollTo = _.noop;

window.URL.createObjectURL = jest.fn(() => 'details');

Element.prototype.scrollTo = _.noop;

export const flushPromises = () => {
	return new Promise<void>((resolve) => {
		setTimeout(() => resolve(), 0);
	});
};

export const getPromiseResolver = () => {
	let resolver: any = null;
	const promise = new Promise((resolve) => {
		resolver = resolve;
	});
	return {
		promise,
		resolver,
	};
};

export const withDefaults = (cardFields: ContractDefinition): Contract => {
	return Object.assign(
		{
			id: uuid(),
			created_at: '2020-01-01T00:00:00.000Z',
			updated_at: null,
			linked_at: {},
			active: true,
			version: '1.0.0',
			tags: [],
			markers: [],
			loop: null,
			links: {},
			requires: [],
			capabilities: [],
			data: {},
		},
		cardFields,
	);
};

export const waitForLazyLoad = async (component) => {
	await waitFor(() => {
		component.update();
		expect(component.find('[data-testid="splash"]')).toHaveLength(0);
	});
};

export const getWrapper = (
	initialState = {},
	cardLoader = {
		getCard: sinon.stub().returns(null),
		selectCard: sinon.stub().returns(sinon.stub().returns(null)),
	},
	setupProps = {
		errorReporter: {
			reportException: (error: Error) => {
				console.error(error);
			},
		},
		sdk: {
			getAuthToken: sinon.stub(),
			stream: {
				on: sinon.stub(),
				emit: sinon.stub(),
			},
		},
	},
) => {
	const store = mockStore(initialState);
	return {
		store,
		wrapper: ({ children }: any) => {
			const stream = {
				on: sinon.stub(),
				emit: sinon.stub(),
			};
			return (
				<CacheProvider value={emotionCache}>
					<MemoryRouter>
						<SetupProvider
							actions={{}}
							sdk={setupProps.sdk as any}
							analytics={{} as any}
							errorReporter={setupProps.errorReporter as any}
							environment={{}}
						>
							<ReduxProvider store={store}>
								<Provider>
									<DndProvider backend={HTML5Backend}>
										<CardLoaderContext.Provider value={cardLoader}>
											{children}
										</CardLoaderContext.Provider>
									</DndProvider>
								</Provider>
							</ReduxProvider>
						</SetupProvider>
					</MemoryRouter>
				</CacheProvider>
			);
		},
	};
};
