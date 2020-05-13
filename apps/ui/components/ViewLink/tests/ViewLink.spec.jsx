/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow,
	mount,
	configure
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import {
	MemoryRouter
} from 'react-router-dom'
import {
	Provider
} from 'rendition'
import ViewLink from '../ViewLink'
import view from './fixtures/all-messages-view.json'
import customView from './fixtures/custom-view.json'
import user from './fixtures/user.json'

import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const TestProvider = ({
	children
}) => {
	return (
		<MemoryRouter>
			<Provider>
				{children}
			</Provider>
		</MemoryRouter>
	)
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<ViewLink
				user={user}
				card={view}
			/>
		)
	})
})

ava('removeView action called when \'Delete this view\' button pressed and action confirmed', async (test) => {
	const actions = {
		removeView: sinon.fake()
	}
	const component =	await mount(
		<ViewLink
			isActive
			user={user}
			card={customView}
			actions={actions}
		/>
		, {
			wrappingComponent: TestProvider
		})

	const contextMenuButton = component.find('button[data-test="view-link--context-menu-btn"]')
	contextMenuButton.simulate('click')

	const deleteViewButton = component.find('button[data-test="view-link--delete-view-btn"]')
	deleteViewButton.simulate('click')

	const confirmButton = component.find('button[data-test="view-delete__submit"]')
	confirmButton.simulate('click')

	test.true(actions.removeView.calledOnce)
	test.is(actions.removeView.getCall(0).lastArg.id, customView.id)
})

ava('\'Delete this view\' button not shown if view is not a valid custom view', async (test) => {
	const actions = {
		removeView: sinon.fake()
	}
	const component =	await mount(
		<ViewLink
			isActive
			user={user}
			card={view}
			actions={actions}
		/>
		, {
			wrappingComponent: TestProvider
		})

	const contextMenuButton = component.find('button[data-test="view-link--context-menu-btn"]')
	contextMenuButton.simulate('click')

	const deleteViewButton = component.find('button[data-test="view-link--delete-view-btn"]')
	test.is(deleteViewButton.length, 0)
})
