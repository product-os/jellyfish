/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper,
	flushPromises
} from '../../../test/ui-setup'
import _ from 'lodash'
import React from 'react'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import {
	SaveCardButton
} from './SaveCardButton'

const card = {
	id: 2,
	slug: 'c-2',
	type: 'card@1.0.0'
}

const updatedCard = _.merge({}, card, {
	name: 'new'
})

const wrappingComponent = getWrapper().wrapper

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context.commonProps = {
		card,
		onDone: sandbox.fake(),
		patch: sandbox.stub().resolves([]),
		onUpdateCard: sandbox.stub().resolves(updatedCard),
		sdk: {
			card: {
				get: sandbox.stub().resolves(updatedCard)
			}
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Card is updated when the button is clicked', async (test) => {
	const {
		commonProps
	} = test.context

	const component = await mount(<SaveCardButton {...commonProps} />, {
		wrappingComponent
	})

	const btn = component.find('button')
	btn.simulate('click')
	await flushPromises()
	test.true(commonProps.patch.calledOnce)
	test.deepEqual(commonProps.patch.getCall(0).firstArg, card)
	test.true(commonProps.onUpdateCard.calledOnce)
	test.deepEqual(commonProps.onUpdateCard.getCall(0).firstArg, card)
	test.true(commonProps.onDone.calledOnce)
	test.deepEqual(commonProps.onDone.getCall(0).firstArg, updatedCard)
})
