/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Provider
} from 'rendition'
import {
	DndProvider
} from 'react-dnd'
import {
	HTML5Backend
} from 'react-dnd-html5-backend'
import {
	Provider as ReduxProvider
} from 'react-redux'
import {
	configure
} from 'enzyme'
import sinon from 'sinon'
import {
	MemoryRouter
} from 'react-router-dom'
import configureStore from 'redux-mock-store'
import {
	CacheProvider
} from '@emotion/react'
import createCache from '@emotion/cache'

// Note: importing CardLoaderContext from the root of
// jellyfish-ui-components results in errors for the 'emotion'
// package. So instead we import directly from the CardLoader file.
import {
	CardLoaderContext
} from '@balena/jellyfish-ui-components'

import Adapter from 'enzyme-adapter-react-16'

window.isUnitTest = true

configure({
	adapter: new Adapter()
})

const middlewares = []
const mockStore = configureStore(middlewares)

class HowlerGlobal {}
global.HowlerGlobal = HowlerGlobal

class Howl {}
global.Howl = Howl

class Sound {}
global.Sound = Sound

class Location {}
global.location = Location

// eslint-disable-next-line no-undef
window.HTMLElement.prototype.scrollIntoView = _.noop

export const flushPromises = () => {
	return new Promise((resolve) => {
		// eslint-disable-next-line no-undef
		return setImmediate(resolve)
	})
}

export const getPromiseResolver = () => {
	let resolver = null
	const promise = new Promise((resolve) => {
		resolver = resolve
	})
	return {
		promise,
		resolver
	}
}

// Needed in order for @emotion cache to be instantiated
global.HTMLElement = window.HTMLElement

const emotionCache = createCache({
	key: 'test'
})

export const getWrapper = (initialState = {}, cardLoader = {
	getCard: sinon.stub().returns(null),
	selectCard: sinon.stub().returns(sinon.stub().returns(null))
}) => {
	const store = mockStore(initialState)
	return {
		store,
		wrapper: ({
			children
		}) => {
			return (
				<CacheProvider value={emotionCache}>
					<MemoryRouter>
						<ReduxProvider store={store}>
							<Provider>
								<DndProvider backend={HTML5Backend}>
									<CardLoaderContext.Provider value={cardLoader}>
										{children}
									</CardLoaderContext.Provider>
								</DndProvider>
							</Provider>
						</ReduxProvider>
					</MemoryRouter>
				</CacheProvider>
			)
		}
	}
}
