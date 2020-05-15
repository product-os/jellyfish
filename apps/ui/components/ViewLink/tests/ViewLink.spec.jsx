/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow,
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import ViewLink from '../ViewLink'
import view from './fixtures/all-messages-view.json'
import customView from './fixtures/custom-view.json'
import user from './fixtures/user.json'

const wrappingComponent = getWrapper().wrapper

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
			wrappingComponent
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
			wrappingComponent
		})

	const contextMenuButton = component.find('button[data-test="view-link--context-menu-btn"]')
	contextMenuButton.simulate('click')

	const deleteViewButton = component.find('button[data-test="view-link--delete-view-btn"]')
	test.is(deleteViewButton.length, 0)
})

ava('\'setDefault\' action called with view as arg when \'Set as default\' context menu item clicked', async (test) => {
	const actions = {
		setDefault: sinon.fake()
	}
	const component =	await mount(
		<ViewLink
			isActive
			isHomeView={false}
			user={user}
			card={customView}
			actions={actions}
		/>
		, {
			wrappingComponent
		})

	const contextMenuButton = component.find('button[data-test="view-link--context-menu-btn"]')
	contextMenuButton.simulate('click')

	const setDefaultButton = component.find('button[data-test="view-link--set-default-btn"]')
	test.is(setDefaultButton.text(), 'Set as default')
	setDefaultButton.simulate('click')

	test.true(actions.setDefault.calledOnce)
	test.is(actions.setDefault.getCall(0).args[0].id, customView.id)
})

ava('\'setDefault\' action called with null as arg when \'Unset as default\' context menu item clicked', async (test) => {
	const actions = {
		setDefault: sinon.fake()
	}
	const component =	await mount(
		<ViewLink
			isActive
			isHomeView
			user={user}
			card={customView}
			actions={actions}
		/>
		, {
			wrappingComponent
		})

	const contextMenuButton = component.find('button[data-test="view-link--context-menu-btn"]')
	contextMenuButton.simulate('click')

	const setDefaultButton = component.find('button[data-test="view-link--set-default-btn"]')
	test.is(setDefaultButton.text(), 'Unset as default')
	setDefaultButton.simulate('click')

	test.true(actions.setDefault.calledOnce)
	test.is(actions.setDefault.getCall(0).args[0], null)
})
