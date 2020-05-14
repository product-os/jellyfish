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
	mount
} from 'enzyme'
import React from 'react'
import _ from 'lodash'
import sinon from 'sinon'
import HomeChannel from '../HomeChannel'
import * as homeChannelProps from './fixtures'

const context = {}

const sandbox = sinon.createSandbox()

ava.beforeEach(async () => {
	context.actions = _.reduce([
		'addChannel',
		'loadViewResults',
		'logout',
		'queryAPI',
		'removeView',
		'removeViewNotice',
		'setChantWidgetOpen',
		'setDefault',
		'setUIState',
		'setViewStarred',
		'streamView',
		'updateUser'
	], (acc, action) => {
		acc[action] = sandbox.stub()
		return acc
	}, {})
	context.actions.queryAPI.resolves([])

	context.history = {
		push: sandbox.stub()
	}
})

ava.afterEach(async () => {
	sandbox.restore()
})

ava('Starred views appear in their own menu section', async (test) => {
	const {
		wrapper
	} = getWrapper()
	const homeChannel = await mount((
		<HomeChannel
			{...homeChannelProps}
			channels={[ homeChannelProps.channel ]}
			actions={context.actions}
			viewNotices={{}}
			subscriptions={{}}
			orgs={[]}
			history={context.history}
		/>
	), {
		wrappingComponent: wrapper
	})

	const starredViews = homeChannelProps.user.data.profile.starredViews
	const starredViewsDiv = homeChannel.find('div[data-test="home-channel__group__starredViews"]')

	starredViews.forEach((starredView) => {
		const starredViewLink = starredViewsDiv.find(`a[data-test="home-channel__item--${starredView}"]`)
		test.is(starredViewLink.length, 1)
	})
})

ava('The home view is loaded on mount if set', async (test) => {
	const homeView = 'view-123'
	const {
		wrapper
	} = getWrapper()
	await mount((
		<HomeChannel
			{...homeChannelProps}
			channels={[ homeChannelProps.channel ]}
			actions={context.actions}
			viewNotices={{}}
			subscriptions={{}}
			orgs={[]}
			homeView={homeView}
			history={context.history}
		/>
	), {
		wrappingComponent: wrapper
	})

	test.true(context.history.push.calledOnce)
	test.is(context.history.push.getCall(0).args[0], homeView)
})
