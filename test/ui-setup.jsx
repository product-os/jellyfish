/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
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
import {
	MemoryRouter
} from 'react-router-dom'
import configureStore from 'redux-mock-store'

import Adapter from 'enzyme-adapter-react-16'

configure({
	adapter: new Adapter()
})

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator', 'XMLHttpRequest', 'HTMLAnchorElement', 'NodeFilter', 'NodeList' ])

const middlewares = []
const mockStore = configureStore(middlewares)

class HowlerGlobal {}
global.HowlerGlobal = HowlerGlobal

class Howl {}
global.Howl = Howl

class Sound {}
global.Sound = Sound

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

export const getWrapper = (initialState = {}) => {
	const store = mockStore(initialState)
	return {
		store,
		wrapper: ({
			children
		}) => {
			return (
				<MemoryRouter>
					<ReduxProvider store={store}>
						<Provider>
							<DndProvider backend={HTML5Backend}>
								{children}
							</DndProvider>
						</Provider>
					</ReduxProvider>
				</MemoryRouter>
			)
		}
	}
}
