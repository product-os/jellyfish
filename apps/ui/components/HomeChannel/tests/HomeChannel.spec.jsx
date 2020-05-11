/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	mount,
	configure
} from 'enzyme'
import React from 'react'
import {
	Provider
} from 'rendition'
import _ from 'lodash'
import sinon from 'sinon'
import HomeChannel from '../HomeChannel'
import * as homeChannelProps from './fixtures'
import Adapter from 'enzyme-adapter-react-16'

const Router = require('react-router-dom').MemoryRouter

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const sandbox = sinon.createSandbox()

const actions = _.reduce([
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

ava.afterEach(async () => {
	sandbox.restore()
})

const Wrapper = ({
	children
}) => {
	return (
		<Router>
			<Provider>{children}</Provider>
		</Router>
	)
}

ava('Starred views appear in their own menu section', async (test) => {
	actions.queryAPI.resolves([])
	const homeChannel = await mount((
		<HomeChannel
			{...homeChannelProps}
			channels={[]}
			actions={actions}
			viewNotices={{}}
			subscriptions={{}}
			orgs={[]}
		/>
	), {
		wrappingComponent: Wrapper
	})

	const starredViews = homeChannelProps.user.data.profile.starredViews
	const starredViewsDiv = homeChannel.find('div[data-test="home-channel__group__starredViews"]')

	starredViews.forEach((starredView) => {
		const starredViewLink = starredViewsDiv.find(`a[data-test="home-channel__item--${starredView}"]`)
		test.is(starredViewLink.length, 1)
	})
})
