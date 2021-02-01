/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import {
	shallow
} from 'enzyme'
import React from 'react'
import {
	ViewRenderer
} from '..'
import {
	paidSupport,
	archivedPaidSupport,
	supportThreadType
} from './fixtures'

const sandbox = sinon.createSandbox()

const user = {
	id: 'u1',
	slug: 'user-1',
	data: {
		profile: {}
	}
}

const types = [ supportThreadType ]

ava.beforeEach((test) => {
	test.context.commonProps = {
		channel: paidSupport,
		user,
		types,
		actions: {
			clearViewData: sandbox.stub(),
			loadViewData: sandbox.stub(),
			loadMoreViewData: sandbox.stub(),
			setViewData: sandbox.stub(),
			setViewLens: sandbox.stub(),
			setViewSlice: sandbox.stub()
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Active slice is initialized to the user\'s view slice, if set', (test) => {
	const {
		commonProps
	} = test.context

	const userActiveSlice = {
		title: 'Status: archived',
		value: {
			path: 'properties.data.properties.status', value: 'archived'
		}
	}

	const wrapper = shallow(
		<ViewRenderer {...commonProps} userActiveSlice={userActiveSlice} />
	)

	test.deepEqual(wrapper.state().activeSlice, userActiveSlice)
})

ava('Active slice is initialized to the slice specified by a custom view\'s filters, if set', (test) => {
	const {
		commonProps
	} = test.context

	const wrapper = shallow(
		<ViewRenderer {...commonProps} channel={archivedPaidSupport} />
	)

	test.deepEqual(wrapper.state().activeSlice, {
		title: 'Status: archived',
		value: {
			path: 'properties.data.properties.status', value: 'archived'
		}
	})

	test.deepEqual(wrapper.state().filters, [ {
		$id: 'properties.data.properties.status',
		type: 'object',
		anyOf: [ {
			$id: 'properties.data.properties.status',
			type: 'object',
			title: 'user-generated-filter',
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							const: 'archived', title: 'status'
						}
					}
				}
			},
			description: 'Status: archived'
		} ]
	} ])
})

ava('Active slice is initialized to the first slice option if not set in user profile or view filter', (test) => {
	const {
		commonProps
	} = test.context

	const wrapper = shallow(
		<ViewRenderer {...commonProps} />
	)

	test.deepEqual(wrapper.state().activeSlice, {
		title: 'Status: open',
		value: {
			path: 'properties.data.properties.status', value: 'open'
		}
	})

	test.deepEqual(wrapper.state().filters, [ {
		$id: 'properties.data.properties.status',
		anyOf: [ {
			$id: 'properties.data.properties.status',
			type: 'object',
			title: 'user-generated-filter',
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							const: 'open'
						}
					}
				}
			},
			description: 'Status: open'
		} ]
	} ])
})
