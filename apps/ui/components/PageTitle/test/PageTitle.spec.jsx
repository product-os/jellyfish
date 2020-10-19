/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import PageTitle from '../PageTitle'
import ViewAllIssues from './fixtures/view-all-issues.json'
import SupportThread from './fixtures/support-thread.json'
import ViewAllIssuesLoading from './fixtures/view-all-issues-loading.json'

const sandbox = sinon.createSandbox()

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('PageTitle displays \'Jellyfish\' if only the home channel is displayed', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={null} unreadCount={0} />)
	const title = component.find('title')
	test.is(title.text(), 'Jellyfish')
})

ava('PageTitle displays unread message count', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={null} unreadCount={3} />)
	const title = component.find('title')
	test.is(title.text(), '(3) | Jellyfish')
})

ava('PageTitle displays channel card name if set', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={ViewAllIssues} unreadCount={0} />)
	const title = component.find('title')
	test.is(title.text(), 'All GitHub issues | Jellyfish')
})

ava('PageTitle displays channel card slug if name not set', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={SupportThread} unreadCount={0} />)
	const title = component.find('title')
	test.is(title.text(), 'support-thread-b98847cc-a80... | Jellyfish')
})

ava('PageTitle displays channel target if card not set', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={ViewAllIssuesLoading} unreadCount={0} />)
	const title = component.find('title')
	test.is(title.text(), 'view-all-issues | Jellyfish')
})

ava('PageTitle displays unread message count and channel details', async (test) => {
	const component = shallow(<PageTitle siteName="Jellyfish" activeChannel={ViewAllIssues} unreadCount={3} />)
	const title = component.find('title')
	test.is(title.text(), '(3) All GitHub issues | Jellyfish')
})
